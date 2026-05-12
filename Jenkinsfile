pipeline {
    // Use any available agent for running the pipeline
    agent any
    // Define tools to be used in the pipeline
    tools {
        nodejs 'NodeJS-26'
        dockerTool 'Docker'
    }
    // Trigger SCM polling every 5 minutes
    triggers {
        pollSCM('H/5 * * * *')
    }
    // Define environment variables
    environment {
        VERSION = "${BUILD_NUMBER}"
        IMAGE_BACKEND = "timmyngn/my-backend:${BUILD_NUMBER}"
        IMAGE_FRONTEND = "timmyngn/my-frontend:${BUILD_NUMBER}"
        JWT_SECRET = credentials('jwt-secret')
    }

    stages {
        // okay
        stage('Build Stage') {
            steps {
                script {
                    echo 'Building...'
                    // Use ONE consistent tag everywhere
                    def backendImage = "${IMAGE_BACKEND}"
                    def frontendImage = "${IMAGE_FRONTEND}"
                    // Build images (MUST match push tag exactly)
                    sh "docker build -t ${backendImage} ./backend"
                    sh "docker build -t ${frontendImage} ./frontend"
                    // Verify images exist BEFORE post block runs
                    sh "docker images | grep ${BUILD_NUMBER} || true"
                    // Save images
                    sh "docker save ${backendImage} > backend-${BUILD_NUMBER}.tar"
                    sh "docker save ${frontendImage} > frontend-${BUILD_NUMBER}.tar"
                    // Archive images
                    archiveArtifacts artifacts: '*.tar', fingerprint: true
                }
            }

            post {
                success {
                    echo 'Build succeeded. Logging into Docker and pushing images...'

                    script {
                        withCredentials([usernamePassword(
                            credentialsId: 'docker-credentials',
                            usernameVariable: 'USER',
                            passwordVariable: 'PASS'
                        )]) {
                            // Login to Docker registry
                            sh '''
                                echo "$PASS" | docker login -u "$USER" --password-stdin
                            '''
                            // Push images
                            sh "docker push ${IMAGE_BACKEND}"
                            sh "docker push ${IMAGE_FRONTEND}"
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
                echo 'Testing...'
                // Install dependencies and run tests with coverage
                sh 'cd backend && npm install'
                withEnv(["JWT_SECRET=${JWT_SECRET}"]) {
                    sh 'cd backend && npm test'
                    sh 'cd backend && npm run test:coverage'
                }
                // Archive test results and coverage reports
                archiveArtifacts artifacts: 'backend/test-results/*.xml', fingerprint: true
                archiveArtifacts artifacts: 'backend/coverage-reports/*.html', fingerprint: true
            }

            post {
                always {
                    junit 'backend/test-results/junit.xml'
                    publishHTML(target: [
                        reportName: 'Coverage Report',
                        reportDir: 'backend/coverage-reports',
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
                echo 'Checking code quality...'
            }
        }

        stage('Security Stage') {
            steps {
                echo 'Performing security checks...'
            }
        }

        stage('Deploy Stage') {
            steps {
                echo 'Deploying...'
            }
        }

        stage('Release Stage') {
            steps {
                echo 'Releasing...'
            }
        }

        stage('Monitoring Stage') {
            steps {
                echo 'Monitoring...'
            }
        }
    }

    // Moved from Build Stage to global post to prevent "tag does not exist" errors
    post {
        always {
            echo 'Cleaning up local Docker images...'
            sh "docker rmi ${IMAGE_BACKEND} ${IMAGE_FRONTEND} || true"
        }
    }
}