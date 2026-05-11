pipeline {
    agent any

    // Trigger SCM polling every 5 minutes
    triggers {
        pollSCM('H/5 * * * *')
    }

    environment {
        VERSION = "${BUILD_NUMBER}"
        IMAGE_BACKEND = "my-backend:${BUILD_NUMBER}"
        IMAGE_FRONTEND = "my-frontend:${BUILD_NUMBER}"
    }

    stages {

        stage('Build Stage') {
            steps {
                echo 'Building...'

                // Build Docker images
                sh "docker build -t ${IMAGE_BACKEND} ./backend"
                sh "docker build -t ${IMAGE_FRONTEND} ./frontend"

                // Save Docker images
                sh "docker save ${IMAGE_BACKEND} > backend-${VERSION}.tar"
                sh "docker save ${IMAGE_FRONTEND} > frontend-${VERSION}.tar"

                archiveArtifacts artifacts: '*.tar', fingerprint: true
            }

            post {
                always {
                    // Cleanup images
                    sh "docker rmi ${IMAGE_BACKEND} || true"
                    sh "docker rmi ${IMAGE_FRONTEND} || true"
                }

                success {
                    echo 'Build succeeded. Logging into Docker and pushing images...'

                    sh '''
                        echo $DOCKER_CREDENTIALS_PSW | docker login -u $DOCKER_CREDENTIALS_USR --password-stdin
                    '''

                    // Push images
                    sh "docker push ${IMAGE_BACKEND}"
                    sh "docker push ${IMAGE_FRONTEND}"
                }

                failure {
                    echo 'Build failed. Sending notification...'
                }
            }
        }

        stage('Test Stage') {
            steps {
                echo 'Testing...'

                sh 'cd backend && npm install && npm test'
                sh 'cd backend && npm run test:coverage'

                archiveArtifacts artifacts: 'backend/test-results/*.xml', fingerprint: true
                archiveArtifacts artifacts: 'backend/coverage-reports/*.html', fingerprint: true
            }

            post {
                always {
                    junit 'backend/test-results/junit.xml'
                }

                success {
                    echo 'Tests passed successfully.'
                }

                failure {
                    echo 'Tests failed.'
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
}