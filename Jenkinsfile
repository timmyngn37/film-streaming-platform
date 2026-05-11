pipeline {
    agent any

    // Trigger the pipeline to run every 5 minutes to check for changes in the SCM
    triggers {
        pollSCM('H/5 * * * *')
    }
    // Set the version environment variable to the current build number
    environment {
        VERSION = "${BUILD_NUMBER}"
        IMAGE_BACKEND = "my-backend:${BUILD_NUMBER}"
        IMAGE_FRONTEND = "my-frontend:${BUILD_NUMBER}"
        DOCKER_CREDENTIALS = credentials('dockerhub-credentials')
    }

    stages {
        stage('Build Stage') {
            steps {
                echo 'Building...'
                // Build Docker images for both backend and frontend using the current build number as the tag
                sh 'docker build -t ${IMAGE_BACKEND} ./backend'
                sh 'docker build -t ${IMAGE_FRONTEND} ./frontend'
                // Save the Docker images as tar files and archive them as build artifacts with fingerprinting enabled
                sh 'docker save ${IMAGE_BACKEND} > backend-${VERSION}.tar'
                sh 'docker save ${IMAGE_FRONTEND} > frontend-${VERSION}.tar'
                archiveArtifacts artifacts: '*.tar', fingerprint: true
            }
            post {
                always {
                    // Clean up Docker images after the build stage to free up space
                    sh 'docker rmi ${IMAGE_BACKEND} || true'
                    sh 'docker rmi ${IMAGE_FRONTEND} || true'
                }
                success {
                    // Push the built Docker images to a container registry using the provided credentials
                    sh 'echo $DOCKER_CREDENTIALS_PSW | docker login -u $DOCKER_CREDENTIALS_USR --password-stdin'
                    sh 'docker push ${IMAGE_BACKEND}'
                    sh 'docker push ${IMAGE_FRONTEND}'
                    echo 'Build succeeded. Proceeding to the next stage...'
                }
                failure {
                    echo 'Build failed. Sending notification...'
                    // Email notification
                }
            }
        }
        stage('Test Stage') {
            steps {
                echo 'Testing...'
                // Run tests for both backend and frontend
                sh 'cd backend && npm install && npm test'
                sh 'cd backend && npm run test:coverage'
                // Archive test results and code coverage reports as build artifacts
                archiveArtifacts artifacts: 'test-results/*.xml', fingerprint: true
                archiveArtifacts artifacts: 'coverage-reports/*.html', fingerprint: true
            }
            post {
                always {
                    junit 'backend/test-results/junit.xml'
                }
                success {
                    echo 'Tests passed. Proceeding to the next stage...'
                }
                failure {
                    echo 'Tests failed. Sending notification...'
                    // Email notification
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