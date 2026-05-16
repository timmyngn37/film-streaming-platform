pipeline {
    // agent defines where the pipeline will run. 'any' means it can run on any available agent.
    agent any
    // tools block specifies the tools that will be used in the pipeline. Here we are using NodeJS and Docker.
    tools {
        nodejs 'NodeJS-26'
        dockerTool 'Docker'
    }
    // triggers block defines when the pipeline should be triggered.
    // Here we are using pollSCM to check for changes in the source code every 5 minutes.
    triggers {
        pollSCM('H/5 * * * *')
    }
    // options block allows us to configure various options for the pipeline.
    options {
        buildDiscarder(logRotator(
            numToKeepStr: '10',        // keep last 10 builds
            artifactNumToKeepStr: '5'  // keep artifacts from last 5 builds
        ))
    }
    // environment block defines environment variables that will be available throughout the pipeline.
    environment {
        VERSION = "${BUILD_NUMBER}"
        IMAGE_BACKEND = "timmyngn/my-backend:${BUILD_NUMBER}"
        IMAGE_FRONTEND = "timmyngn/my-frontend:${BUILD_NUMBER}"
    }
    // stages block defines the different stages of the pipeline. Each stage can have its own steps and post actions.
    stages {
        stage('Build Stage') {
            steps {
                script {
                    echo 'Building Docker images for backend and frontend...'
                    // Build Docker images for backend and frontend,
                    // tag them with the build number,
                    // and save them as tar files for archiving.
                    sh '''
                        docker build -t "$IMAGE_BACKEND" ./backend
                        docker build -t "$IMAGE_FRONTEND" ./frontend

                        docker images | grep "$BUILD_NUMBER" || true

                        docker save "$IMAGE_BACKEND" > backend-"$BUILD_NUMBER".tar
                        docker save "$IMAGE_FRONTEND" > frontend-"$BUILD_NUMBER".tar
                    '''

                    archiveArtifacts artifacts: '*.tar', fingerprint: true
                }
            }
            post {
                success {
                    echo 'Build succeeded. Logging into Docker Hub and pushing images...'
                    // Use withCredentials to securely access Docker Hub credentials and push the built images.
                    script {
                        withCredentials([
                            usernamePassword(
                                credentialsId: 'docker-credentials',
                                usernameVariable: 'USER',
                                passwordVariable: 'PASS'
                            )
                        ]) {

                            sh '''
                                echo "$PASS" | docker login -u "$USER" --password-stdin

                                docker push "$IMAGE_BACKEND"
                                docker push "$IMAGE_FRONTEND"
                            '''
                        }
                    }
                }
                failure {
                    echo 'Build failed.'
                }
            }
        }
        stage('Test Stage') {
            steps {
                echo 'Running tests...'
                // Install dependencies for the backend and run tests with coverage reporting.
                sh '''
                    cd backend
                    npm install
                '''
                // Use withCredentials to securely access the JWT secret needed for testing.
                withCredentials([
                    string(
                        credentialsId: 'jwt-secret',
                        variable: 'JWT_SECRET'
                    )
                ]) {

                    sh '''
                        cd backend

                        export JWT_SECRET="$JWT_SECRET"

                        npm test
                        npm run test:coverage
                    '''
                }
                // Archive test results and coverage reports for later analysis.
                archiveArtifacts artifacts: 'backend/test-results/*.xml', fingerprint: true
                archiveArtifacts artifacts: 'backend/coverage/**', fingerprint: true
            }

            post {
                always {
                    // Publish test results and coverage reports to Jenkins.
                    junit 'backend/test-results/junit.xml'
                    // Use the publishHTML plugin to display the coverage report in Jenkins.
                    publishHTML(target: [
                        reportName: 'Coverage Report',
                        reportDir: 'backend/coverage/lcov-report',
                        reportFiles: 'index.html',
                        keepAll: true,
                        allowMissing: false,
                        alwaysLinkToLastBuild: true
                    ])
                }
                success {
                    echo 'Tests passed successfully.'
                }
                failure {
                    error 'Tests failed.'
                }
            }
        }

        stage('Code Quality Stage') {
            steps {
                echo 'Running SonarQube analysis...'
                // Use withSonarQubeEnv to set up the environment for SonarQube analysis and run the sonar-scanner command.
                script {
                    def scannerHome = tool 'SonarScanner'

                    withSonarQubeEnv('SonarQube') {
                        sh """
                            ${scannerHome}/bin/sonar-scanner \
                                -Dproject.settings=backend/sonar-project.properties
                        """
                    }
                    // Wait for SonarQube analysis to complete and check the quality gate status.
                    sleep(time: 10, unit: 'SECONDS')
                    // Use a timeout to avoid waiting indefinitely for the quality gate result.
                    timeout(time: 3, unit: 'MINUTES') {
                        def qg = waitForQualityGate()
                        if (qg.status != 'OK') {
                            error "Quality Gate failed: ${qg.status}"
                        }
                    }
                }
            }
        }
        stage('Security Stage') {
            steps {
                script {
                    echo 'Performing security checks...'
                    // Run npm audit to check for vulnerabilities in the backend dependencies and generate a JSON report.
                    sh '''
                        cd backend
                        npm audit --json 2>/dev/null > ../audit-report.json || true
                        npm audit fix || true
                    '''
                    // Check if the audit report was generated and read it as JSON.
                    def auditFile = fileExists('audit-report.json')
                    if (!auditFile) {
                        error 'audit-report.json was not generated.'
                    }
                    // Read the audit report and extract vulnerability information.
                    def auditReport = readJSON file: 'audit-report.json'
                    // Check if the metadata and vulnerabilities information is present in the audit report.
                    def vulns = auditReport?.metadata?.vulnerabilities
                    if (vulns == null) {
                        echo 'No vulnerability metadata found in audit report.'
                    } else {
                        def total = (vulns?.low      ?: 0) +
                                    (vulns?.moderate  ?: 0) +
                                    (vulns?.high      ?: 0) +
                                    (vulns?.critical  ?: 0)

                        echo "Vulnerabilities — low: ${vulns.low}, moderate: ${vulns.moderate}, high: ${vulns.high}, critical: ${vulns.critical}"
                        echo "Total: ${total}"

                        if (total > 0) {
                            echo 'Security issues found.'
                            currentBuild.result = 'UNSTABLE'
                        } else {
                            echo 'No vulnerabilities found.'
                        }
                    }
                    // Archive the audit report for later analysis and reference.
                    archiveArtifacts artifacts: 'audit-report.json', fingerprint: true
                }
            }
            post {
                success {
                    echo 'Security checks completed successfully.'
                }
                unstable {
                    echo 'Security stage completed with warnings (vulnerabilities found).'
                }
                failure {
                    echo 'Security checks failed.'
                }
            }
        }
        stage('Deploy Stage') {
            steps {
                script {
                    echo 'Deploying application...'
                    // Save the current image version for potential rollback, copy environment variables, and deploy using Docker Compose.
                    sh '''
                        CURRENT=$(docker inspect --format='{{.Config.Image}}' my-backend 2>/dev/null || echo "none")
                        echo $CURRENT > .previous_version

                        cp /var/jenkins_home/.env backend/.env
                        VERSION=$BUILD_NUMBER docker compose up -d    

                        sleep 10
                        docker ps | grep my-backend || exit 1
                        docker ps | grep my-frontend || exit 1
                    '''
                }
            }

            post {
                failure {
                    echo 'Deployment failed. Rolling back...'
                    // If deployment fails, read the previous version from the file and roll back to it using Docker Compose.
                    sh '''
                        PREVIOUS=$(cat .previous_version)
                        if [ "$PREVIOUS" != "none" ]; then
                            docker compose down
                            sed -i "s|$IMAGE_BACKEND|$PREVIOUS|g" docker-compose.yml
                            docker compose up -d
                            echo "Rolled back to $PREVIOUS"
                        fi
                    '''
                }
                success {
                    echo 'Deployment successful.'
                }
            }
        }

        stage('Release Stage') {
            steps {
                echo 'Releasing application...'
                // Use withCredentials to securely access the GitHub token and create a new git tag for the release,
                // then push it to the remote repository.
                withCredentials([
                    string(
                        credentialsId: 'github-token',
                        variable: 'GIT_TOKEN'
                    )
                ]) {
                    sh '''
                        git config user.email "jenkins@ci.com"
                        git config user.name "Jenkins"
                        git tag -a v$BUILD_NUMBER -m "Release version $BUILD_NUMBER"
                        git push https://timmyngn37:$GIT_TOKEN@github.com/timmyngn37/film-streaming-platform.git v$BUILD_NUMBER
                    '''
                }
            }
            post {
                success {
                    echo "Release v${BUILD_NUMBER} completed successfully."
                    echo "Environment: production"
                    echo "Backend image: ${IMAGE_BACKEND}"
                    echo "Frontend image: ${IMAGE_FRONTEND}"
                }
                failure {
                    echo "Release v${BUILD_NUMBER} failed."
                }
            }
        }

        stage('Monitoring Stage') {
            steps {
                script {
                    echo 'Configuring monitoring...'
                    // Deploy Prometheus, Grafana, and Node Exporter using Docker Compose, and verify that they are running.
                    sh '''
                        VERSION=$BUILD_NUMBER docker compose up -d prometheus grafana node-exporter

                        sleep 5

                        docker ps | grep prometheus || echo "WARNING: Prometheus not running"
                        docker ps | grep grafana || echo "WARNING: Grafana not running"
                        docker ps | grep node-exporter || echo "WARNING: Node Exporter not running"
                    '''
                    // Provide information on how to access the monitoring tools and metrics.
                    echo "Prometheus available at http://localhost:9090"
                    echo "Grafana dashboard available at http://localhost:3001"
                    echo "Metrics endpoint: http://localhost:9100/metrics"
                }
            }
            post {
                success {
                    echo 'Monitoring configured successfully.'
                }
                failure {
                    echo 'Monitoring setup failed.'
                }
            }
        }
    }
    post {
        always {
            echo 'Cleaning up...'
            // Remove the built Docker images from the local Docker cache to free up space
            sh '''
                docker rmi "$IMAGE_BACKEND" "$IMAGE_FRONTEND" || true
            '''
            // Use the cleanWs step to clean up the workspace after the pipeline completes  
            cleanWs()
        }
    }
}