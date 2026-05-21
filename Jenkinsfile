pipeline {
    agent any
    
    // These variables will be linked to your accounts in Phase 2
    environment {
        DOCKER_USERNAME = 'roshansharma999'
        IMAGE_NAME = 'uniportal'
        
        // Secure tokens that we will put into Jenkins later
        DOCKER_CREDS = credentials('dockerhub-credentials')
        VERCEL_TOKEN = credentials('vercel-token')
        NVD_API_KEY = credentials('nvd-api-key')
    }
    
    stages {
        stage('1. Pull Code') {
            steps {
                // Jenkins downloads your latest code from GitHub
                checkout scm
            }
        }
        
        stage('2. Install Packages') {
            steps {
                // Installs the Node modules required to build/test
                sh 'npm install'
            }
        }
        
        stage('3. OWASP Dependency Check') {
            steps {
                // Scans your packages for known vulnerabilities.
                // Note: We will install the "OWASP Dependency-Check" plugin in Jenkins in Phase 2
                dependencyCheck additionalArguments: "--scan . --nvdApiKey ${NVD_API_KEY}", odcInstallation: 'owasp-tool'
            }
        }
        
        stage('4. SonarQube Security Scan') {
            environment {
                // Note: We will configure "SonarScanner" in Jenkins in Phase 2
                scannerHome = tool 'SonarScanner'
            }
            steps {
                // Scans your actual source code for bugs and vulnerabilities
                withSonarQubeEnv('SonarQube-Server') { 
                    sh "${scannerHome}/bin/sonar-scanner \
                        -Dsonar.projectKey=Uniportal \
                        -Dsonar.sources=."
                }
            }
        }
        
        stage('5. Build & Push to Docker Hub') {
            steps {
                script {
                    // Logs into your Docker Hub account
                    sh "echo ${DOCKER_CREDS_PSW} | docker login -u ${DOCKER_CREDS_USR} --password-stdin"
                    
                    // Builds the image using the Dockerfile we just created
                    def customImage = docker.build("${DOCKER_USERNAME}/${IMAGE_NAME}:${env.BUILD_ID}")
                    
                    // Uploads the image to Docker Hub
                    customImage.push()
                    customImage.push("latest")
                }
            }
        }
        
        stage('6. Deploy Live to Vercel') {
            steps {
                // Uses the Vercel token to push your code directly to the web
                sh 'npx vercel --prod --token $VERCEL_TOKEN --yes'
            }
        }
    }
    
    post {
        always {
            // Cleans up the leftover Docker files to save space on your Ubuntu machine
            sh "docker rmi ${DOCKER_USERNAME}/${IMAGE_NAME}:${env.BUILD_ID} || true"
        }
    }
}
