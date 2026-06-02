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
        IMAGE_BACKEND = "timmyngn/my-backend:${VERSION}"
        IMAGE_FRONTEND = "timmyngn/my-frontend:${VERSION}"
    }
    stages {
        stage('Build Stage') {
            steps {
                script {
                    echo 'Building Docker images for backend and frontend...'
                    // Build Docker images for backend and frontend and
                    // tag them with the build number to ensure uniqueness.
                    sh '''
                        docker build -t "$IMAGE_BACKEND" ./backend
                        docker build -t "$IMAGE_FRONTEND" ./frontend

                        docker images | grep "$VERSION" || true

                        docker save "$IMAGE_BACKEND" > backend-"$VERSION".tar
                        docker save "$IMAGE_FRONTEND" > frontend-"$VERSION".tar
                    '''
                    // Archive tar files only here — manifest is written in post{success}
                    // and archived there, after it has been created.
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

                                # Push latest tag alongside the versioned tag.
                                docker tag "$IMAGE_BACKEND" timmyngn/my-backend:latest
                                docker tag "$IMAGE_FRONTEND" timmyngn/my-frontend:latest
                                docker push timmyngn/my-backend:latest
                                docker push timmyngn/my-frontend:latest
                                echo "Pushed versioned tags: $BUILD_NUMBER and convenience tag: latest"

                                # Registry retention policy: keep only the 5 most recent tags on Docker Hub.
                                # Full audit trail is preserved via build-manifest.txt in Jenkins artifacts.
                                TOKEN=$(curl -s -X POST \
                                    -H "Content-Type: application/json" \
                                    -d "{\"username\": \"$USER\", \"password\": \"$PASS\"}" \
                                    https://hub.docker.com/v2/users/login/ \
                                    | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

                                for REPO in my-backend my-frontend; do
                                    TAGS=$(curl -s "https://hub.docker.com/v2/repositories/timmyngn/${REPO}/tags/?page_size=100" \
                                        | grep -o '"name":"[^"]*"' \
                                        | grep -o '[0-9]*' \
                                        | sort -rn \
                                        | tail -n +6)

                                    for TAG in $TAGS; do
                                        echo "[Retention] Removing timmyngn/${REPO}:${TAG} — only 5 latest tags kept on registry"
                                        curl -X DELETE \
                                            -H "Authorization: Bearer $TOKEN" \
                                            "https://hub.docker.com/v2/repositories/timmyngn/${REPO}/tags/${TAG}/"
                                    done
                                done
                            '''

                            // Write manifest using Groovy after the shell block completes.
                            def gitCommit = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                            def gitBranch = env.GIT_BRANCH?.replaceFirst('origin/', '') ?: 'main'
                            def buildDate = sh(script: 'date -u +"%Y-%m-%dT%H:%M:%SZ"', returnStdout: true).trim()

                            writeFile(file: 'build-manifest.txt', text:
                                "Build Number  : ${BUILD_NUMBER}\n" +
                                "Build Date    : ${buildDate}\n" +
                                "Git Commit    : ${gitCommit}\n" +
                                "Git Branch    : ${gitBranch}\n" +
                                "Backend Image : ${IMAGE_BACKEND}\n" +
                                "Frontend Image: ${IMAGE_FRONTEND}\n" +
                                "Retention     : 5 most recent tags kept on Docker Hub\n"
                            )

                            echo "Build manifest written:"
                            echo readFile('build-manifest.txt')

                            // Archive manifest now that it exists.
                            archiveArtifacts artifacts: 'build-manifest.txt', fingerprint: true
                        }
                    }
                }
                failure {
                    echo 'Build failed. Check Docker build logs above for image build or push errors.'
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
                    '''
                    // npm test runs jest --coverage --testResultsProcessor=jest-junit in one pass.
                    // Coverage and test results are generated together, no duplicate run needed.
                }
            }
            post {
                always {
                    // Publish test results to Jenkins build summary.
                    junit allowEmptyResults: true, testResults: 'backend/test-results/junit.xml'
                    // Render coverage report as HTML page accessible from Jenkins UI.
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
                    // Archive results only after they have been successfully generated.
                    archiveArtifacts artifacts: 'backend/test-results/*.xml', fingerprint: true
                    archiveArtifacts artifacts: 'backend/coverage/**', fingerprint: true
                }
                failure {
                    error 'Tests failed. Pipeline halted to prevent broken build from proceeding.'
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

                    // Wait for SonarQube Quality Gate result
                    timeout(time: 3, unit: 'MINUTES') {
                        def qg = waitForQualityGate()
                        echo "Quality Gate status: ${qg.status}"

                        if (qg.status != 'OK') {
                            error "Quality Gate failed: ${qg.status}"
                        } else {
                            echo "Quality Gate passed - code meets all reliability, maintainability and coverage thresholds."
                        }
                    }
                }
            }

            post {
                success {
                    echo 'SonarQube analysis completed successfully.'
                }
                failure {
                    echo 'SonarQube analysis failed. Check the SonarQube dashboard for quality gate details.'
                }
            }
        }
        stage('Security Stage') {
            steps {
                script {
                    echo 'Performing security checks...'
                    // Backend audit
                    sh '''
                        cd backend
                        npm audit --json 2>/dev/null > ../audit-report-backend.json || true
                    '''
                    // Frontend audit
                    sh '''
                        cd frontend
                        npm audit --json 2>/dev/null > ../audit-report-frontend.json || true
                    '''
                    // Trivy image scan
                    sh '''
                        if ! command -v trivy &> /dev/null; then
                            curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
                        fi

                        trivy image --exit-code 0 \
                            --severity LOW,MEDIUM,HIGH,CRITICAL \
                            --format json \
                            --output trivy-backend.json \
                            "$IMAGE_BACKEND" || true

                        trivy image --exit-code 0 \
                            --severity LOW,MEDIUM,HIGH,CRITICAL \
                            --format json \
                            --output trivy-frontend.json \
                            "$IMAGE_FRONTEND" || true
                    '''
                    // Process backend audit results
                    def backendAudit = fileExists('audit-report-backend.json')
                        ? readJSON(file: 'audit-report-backend.json')
                        : null
                    if (backendAudit) {
                        def vulns = backendAudit?.metadata?.vulnerabilities

                        if (vulns) {
                            echo "=== Backend NPM Audit: Severity Summary ==="
                            echo "Low:      ${vulns.low ?: 0}"
                            echo "Moderate: ${vulns.moderate ?: 0}"
                            echo "High:     ${vulns.high ?: 0}"
                            echo "Critical: ${vulns.critical ?: 0}"
                            // Only fail on high/critical - low and moderate are informational.
                            def serious = (vulns?.high ?: 0) + (vulns?.critical ?: 0)

                            if (serious > 0) {
                                echo "WARNING: ${serious} high/critical vulnerabilities found in backend."
                                echo "Run 'npm audit' locally and review before merging."
                                currentBuild.result = 'UNSTABLE'
                            } else {
                                echo "No high/critical vulnerabilities in backend."
                            }
                        }
                        // Documenting per-package details from the backend audit report.
                        def pkgVulns = backendAudit?.vulnerabilities

                        if (pkgVulns) {
                            echo "=== Backend NPM Audit: Vulnerability Details ==="

                            pkgVulns.each { name, info ->
                                def severity = info?.via?.collect {
                                    it instanceof Map ? it?.severity : null
                                }?.findAll { it }?.join(", ") ?: "unknown"

                                def title = info?.via?.collect {
                                    it instanceof Map ? it?.title : null
                                }?.findAll { it }?.join("; ") ?: "no description available"

                                def fixable = info?.fixAvailable
                                    ? "Fix available"
                                    : "No fix available"

                                echo "  PACKAGE:  ${name}"
                                echo "  SEVERITY: ${severity}"
                                echo "  ISSUE:    ${title}"
                                echo "  STATUS:   ${fixable}"
                                echo "  ---"
                            }
                        }
                    }
                    // Process frontend audit results
                    def frontendAudit = fileExists('audit-report-frontend.json')
                        ? readJSON(file: 'audit-report-frontend.json')
                        : null
                    if (frontendAudit) {
                        def vulns = frontendAudit?.metadata?.vulnerabilities

                        if (vulns) {
                            echo "=== Frontend NPM Audit: Severity Summary ==="
                            echo "Low:      ${vulns.low ?: 0}"
                            echo "Moderate: ${vulns.moderate ?: 0}"
                            echo "High:     ${vulns.high ?: 0}"
                            echo "Critical: ${vulns.critical ?: 0}"
                            // Only fail on high/critical - low and moderate are informational.
                            def serious = (vulns?.high ?: 0) + (vulns?.critical ?: 0)

                            if (serious > 0) {
                                echo "WARNING: ${serious} high/critical vulnerabilities found in frontend."
                                currentBuild.result = 'UNSTABLE'
                            } else {
                                echo "No high/critical vulnerabilities in frontend."
                            }
                        }
                        def pkgVulns = frontendAudit?.vulnerabilities

                        if (pkgVulns) {
                            echo "=== Frontend NPM Audit: Vulnerability Details ==="

                            pkgVulns.each { name, info ->
                                def severity = info?.via?.collect {
                                    it instanceof Map ? it?.severity : null
                                }?.findAll { it }?.join(", ") ?: "unknown"

                                def title = info?.via?.collect {
                                    it instanceof Map ? it?.title : null
                                }?.findAll { it }?.join("; ") ?: "no description available"

                                def fixable = info?.fixAvailable
                                    ? "Fix available"
                                    : "No fix available"

                                echo "  PACKAGE:  ${name}"
                                echo "  SEVERITY: ${severity}"
                                echo "  ISSUE:    ${title}"
                                echo "  STATUS:   ${fixable}"
                                echo "  ---"
                            }
                        }
                    }
                    // Documenting Trivy scan results for both backend and frontend images.
                    ["trivy-backend.json", "trivy-frontend.json"].each { trivyFile ->
                        if (fileExists(trivyFile)) {
                            def trivyData = readJSON(file: trivyFile)
                            // Derive a human-readable label from the filename for the header.
                            def label = trivyFile.contains("backend")
                                ? "Backend"
                                : "Frontend"

                            echo "=== Trivy ${label} Image Scan: Vulnerability Details ==="

                            trivyData?.Results?.each { result ->

                                if (!result?.Vulnerabilities) {
                                    return
                                }

                                echo "  Target: ${result?.Target ?: 'unknown'}"

                                result.Vulnerabilities.each { v ->
                                    echo "  PACKAGE:   ${v.PkgName} (installed: ${v.InstalledVersion ?: 'unknown'})"
                                    echo "  CVE:       ${v.VulnerabilityID}"
                                    echo "  SEVERITY:  ${v.Severity}"
                                    echo "  TITLE:     ${v.Title ?: 'n/a'}"
                                    echo "  FIX:       ${v.FixedVersion ? v.FixedVersion : 'none available'}"
                                    echo "  ---"
                                }
                            }
                        }
                    }
                }
            }
            post {
                always {
                    // Archive all generated JSON reports regardless of outcome.
                    archiveArtifacts(
                        artifacts: 'audit-report-backend.json, audit-report-frontend.json, trivy-backend.json, trivy-frontend.json',
                        fingerprint: true,
                        allowEmptyArchive: true
                    )
                }
                success {
                    echo 'Security checks completed. Review console log and archived reports for full vulnerability details.'
                }
                unstable {
                    echo 'Security checks found high/critical vulnerabilities - manual review required.'
                    echo 'Check archived audit reports and the console log details above.'
                }
                failure {
                    echo 'Security stage failed unexpectedly.'
                }
            }
        }
        stage('Deploy Stage') {
            steps {
                script {
                    echo 'Deploying application...'
                    // Save current image version for rollback, inject env vars, deploy.
                    sh '''
                        CURRENT=$(docker inspect --format='{{.Config.Image}}' my-backend 2>/dev/null || echo "none")
                        echo $CURRENT > .previous_version

                        cp /var/jenkins_home/.env backend/.env

                        # Remove monitoring containers before deploying app.
                        docker rm -f node-exporter grafana prometheus 2>/dev/null || true

                        # Deploy backend and frontend with versioned image tags.
                        VERSION=$BUILD_NUMBER docker compose up -d backend frontend
                        sleep 10

                        # Health checks to confirm deployment succeeded.
                        docker ps | grep my-backend || exit 1
                        docker ps | grep my-frontend || exit 1
                        curl -f http://host.docker.internal:5000/health && echo "Backend API healthy" || exit 1
                    '''
                }
            }
            post {
                failure {
                    echo 'Deployment failed. Rolling back...'
                    sh '''
                        if [ ! -f .previous_version ]; then
                            echo "No previous version recorded, skipping rollback."
                            exit 0
                        fi

                        PREVIOUS=$(cat .previous_version)
                        if [ -z "$PREVIOUS" ] || [ "$PREVIOUS" = "none" ]; then
                            echo "No valid previous version found, skipping rollback."
                            exit 0
                        fi

                        echo "Rolling back to: $PREVIOUS"
                        docker compose down --remove-orphans || true
                        docker rm -f node-exporter grafana prometheus 2>/dev/null || true

                        sed -i "s|$IMAGE_BACKEND|$PREVIOUS|g" docker-compose.yml
                        VERSION=$BUILD_NUMBER docker compose up -d backend frontend
                        sleep 10

                        curl -f http://host.docker.internal:5000/health \
                            && echo "Rollback successful to $PREVIOUS" \
                            || echo "Rollback health check failed"
                    '''
                }
                success {
                    echo "Deployment successful. Backend and frontend running as build ${BUILD_NUMBER}."
                }
            }
        }
        stage('Release Stage') {
            when {
                expression {
                    def lastTag = sh(
                        script: 'git describe --tags --abbrev=0 2>/dev/null || echo ""',
                        returnStdout: true
                    ).trim()

                    if (!lastTag) return true

                    def commitsSince = sh(
                        script: "git rev-list ${lastTag}..HEAD --count",
                        returnStdout: true
                    ).trim().toInteger()

                    return commitsSince > 0
                }
            }
            steps {
                echo 'Releasing application...'
                withCredentials([
                    string(credentialsId: 'github-token', variable: 'GIT_TOKEN')
                ]) {
                    sh '''
                        git config user.email "jenkins@ci.com"
                        git config user.name "Jenkins"

                        # Collect commit messages since last tag
                        LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

                        if [ -z "$LAST_TAG" ]; then
                            COMMIT_LOG=$(git log --oneline)
                        else
                            COMMIT_LOG=$(git log ${LAST_TAG}..HEAD --oneline)
                        fi

                        echo "Changes in this release:"
                        echo "$COMMIT_LOG"

                        git tag -a v$BUILD_NUMBER -m "Release version $BUILD_NUMBER

                    Changes:
                    $COMMIT_LOG"

                        git push https://timmyngn37:$GIT_TOKEN@github.com/timmyngn37/film-streaming-platform.git v$BUILD_NUMBER

                        # Build JSON body safely using Python
                        BODY=$(python3 -c "
                    import json, sys
                    tag = 'v$BUILD_NUMBER'
                    body = sys.stdin.read()
                    print(json.dumps({'tag_name': tag, 'name': 'Release ' + tag, 'body': body, 'draft': False, 'prerelease': False}))
                    " <<'EOF'
                    $COMMIT_LOG
                    EOF
                    )

                        # Create GitHub Release via API
                        RELEASE_RESPONSE=$(curl -s -X POST \
                            -H "Authorization: token $GIT_TOKEN" \
                            -H "Content-Type: application/json" \
                            -d "$BODY" \
                            https://api.github.com/repos/timmyngn37/film-streaming-platform/releases)

                        RELEASE_URL=$(echo "$RELEASE_RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('html_url',''))")
                        echo "GitHub Release created: $RELEASE_URL"
                    '''
                }
            }
            post {
                success {
                    echo "Release v${BUILD_NUMBER} tagged and published to GitHub."
                    echo "Release URL: https://github.com/timmyngn37/film-streaming-platform/releases/tag/v${BUILD_NUMBER}"
                    echo "Backend image : ${IMAGE_BACKEND}"
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

                    sh '''
                        # Stop and remove containers while preserving named volumes.
                        docker compose stop prometheus grafana node-exporter alertmanager 2>/dev/null || true
                        docker compose rm -f prometheus grafana node-exporter alertmanager 2>/dev/null || true

                        docker compose up -d prometheus grafana node-exporter alertmanager

                        echo "Waiting for services to start..."

                        sleep 30

                        # Prometheus health check with retries
                        for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
                            if curl -sf http://host.docker.internal:9090/-/healthy; then
                                echo "Prometheus healthy"
                                break
                            fi

                            echo "Waiting for Prometheus... attempt $i"
                            sleep 5

                            if [ $i -eq 12 ]; then
                                echo "ERROR: Prometheus not healthy"
                                docker logs prometheus --tail 100 || true
                                exit 1
                            fi
                        done

                        # Grafana health check with retries
                        for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
                            if curl -sf http://host.docker.internal:3001/api/health | grep -q "ok"; then
                                echo "Grafana healthy"
                                break
                            fi

                            echo "Waiting for Grafana... attempt $i"
                            sleep 5

                            if [ $i -eq 12 ]; then
                                echo "ERROR: Grafana not healthy"
                                docker logs grafana --tail 100 || true
                                exit 1
                            fi
                        done

                        # Alertmanager health check
                        curl -sf http://host.docker.internal:9093/-/healthy \
                            && echo "Alertmanager healthy" \
                            || echo "WARNING: Alertmanager not healthy"

                        # Node Exporter metrics check
                        curl -sf http://host.docker.internal:9100/metrics \
                            | grep -q "node_cpu" \
                            && echo "Node metrics available" \
                            || echo "WARNING: Node metrics not available"

                        # Prometheus targets check
                        curl -sf http://host.docker.internal:9090/api/v1/targets \
                            | grep -q '"health":"up"' \
                            && echo "Prometheus targets healthy" \
                            || echo "WARNING: Some targets are down"

                        # Alert rules check
                        curl -sf http://host.docker.internal:9090/api/v1/rules \
                            | grep -q "HighCpuUsage" \
                            && echo "Alert rules loaded" \
                            || echo "WARNING: Alert rules not loaded"
                    '''

                    echo "Prometheus:    http://localhost:9090"
                    echo "Grafana:       http://localhost:3001"
                    echo "Alertmanager:  http://localhost:9093"
                    echo "Node Exporter: http://localhost:9100/metrics"
                }
            }

            post {
                success {
                    echo "Monitoring stack healthy. Prometheus, Grafana, Alertmanager and Node Exporter running for build ${BUILD_NUMBER}."
                }

                failure {
                    echo 'Monitoring setup failed.'
                    sh '''
                        docker logs prometheus 2>/dev/null || true
                        docker logs grafana 2>/dev/null || true
                        docker logs alertmanager 2>/dev/null || true
                        docker logs node-exporter 2>/dev/null || true
                    '''
                    sh '''
                        docker compose stop prometheus grafana node-exporter alertmanager 2>/dev/null || true
                        docker compose rm -f prometheus grafana node-exporter alertmanager 2>/dev/null || true
                    '''
                }
            }
        }
    }
    post {
        always {
            echo 'Cleaning up...'
            // Remove unused Docker images to free up disk space
            sh 'docker image prune -f || true'
            // Use the cleanWs step to clean up the workspace after the pipeline completes
            cleanWs(patterns: [[pattern: 'prometheus.yml', type: 'EXCLUDE']])
        }
    }
}