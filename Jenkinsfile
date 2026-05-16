pipeline {
    agent any

    tools {
        nodejs 'NodeJS-26'
        dockerTool 'Docker'
    }

    triggers {
        pollSCM('H/5 * * * *')
    }

    environment {
        VERSION = "${BUILD_NUMBER}"
        IMAGE_BACKEND = "timmyngn/my-backend:${BUILD_NUMBER}"
        IMAGE_FRONTEND = "timmyngn/my-frontend:${BUILD_NUMBER}"
    }

    stages {

        stage('Build Stage') {
            steps {
                script {
                    echo 'Building Docker images for backend and frontend...'

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

                sh '''
                    cd backend
                    npm install
                '''

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

                archiveArtifacts artifacts: 'backend/test-results/*.xml', fingerprint: true
                archiveArtifacts artifacts: 'backend/coverage/**', fingerprint: true
            }

            post {
                always {
                    junit 'backend/test-results/junit.xml'

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

                script {
                    def scannerHome = tool 'SonarScanner'

                    withSonarQubeEnv('SonarQube') {
                        sh """
                            ${scannerHome}/bin/sonar-scanner \
                                -Dproject.settings=backend/sonar-project.properties
                        """
                    }

                    sleep(time: 10, unit: 'SECONDS')

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

                    sh '''
                        cd backend
                        npm audit --json 2>/dev/null > ../audit-report.json || true
                        npm audit fix --force || true
                    '''

                    def auditFile = fileExists('audit-report.json')
                    if (!auditFile) {
                        error 'audit-report.json was not generated.'
                    }

                    def auditReport = readJSON file: 'audit-report.json'

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
                echo 'Deploying application...'
            }
        }

        stage('Release Stage') {
            steps {
                echo 'Releasing application...'
            }
        }

        stage('Monitoring Stage') {
            steps {
                echo 'Monitoring application...'
            }
        }
    }

    post {
        always {
            echo 'Cleaning up local Docker images...'

            sh '''
                docker rmi "$IMAGE_BACKEND" "$IMAGE_FRONTEND" || true
            '''
        }
    }
}