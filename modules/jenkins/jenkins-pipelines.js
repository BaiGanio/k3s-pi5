// modules/jenkins/jenkins-pipelines.js
// M5: Jenkins Pipelines — Declarative Pipeline as Code (Jenkinsfile)
// Extracted from DOB-M5 lecture (Slides-M5-Jenkins.md) and Practice (Part 3)
// .NET / Node.js pipeline examples with PostgreSQL integration tests

window.pageBlocks = [

  // ── What is Pipeline as Code? ─────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Pipeline as Code — The Jenkinsfile',
    content: `
      <p>
        A <strong>Jenkinsfile</strong> is a text file checked into your repository that defines
        the entire CI/CD pipeline. This is <strong>Pipeline as Code</strong> — the pipeline
        definition lives alongside the application code it builds, versions with it, and is
        reviewed in pull requests like any other code change.
      </p>

      <p>
        Without Pipeline as Code, build logic lives in the Jenkins UI — click-configured,
        invisible to version control, unreviewable, and unreproducible. A Jenkinsfile fixes all
        of that:
      </p>
      <ul>
        <li><strong>Versioned</strong> — pipeline changes are git commits with messages and authors</li>
        <li><strong>Reviewed</strong> — a PR that adds a deployment stage gets the same scrutiny as a code change</li>
        <li><strong>Reproducible</strong> — <code>git checkout</code> any commit and its Jenkinsfile describes the exact pipeline that built it</li>
        <li><strong>Portable</strong> — the same Jenkinsfile works on any Jenkins instance with the required plugins</li>
      </ul>
    `,
  },

  // ── Declarative vs Scripted ───────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Two Pipeline Styles: Declarative and Scripted',
    content: `
      <p>Jenkins supports two pipeline syntaxes:</p>

      <h4>Declarative Pipeline (recommended)</h4>
      <ul>
        <li>Starts with <code>pipeline { }</code></li>
        <li>Structured, opinionated — you declare <em>what</em> you want, Jenkins handles the execution flow</li>
        <li>Easier to read, write, and maintain — ideal for teams</li>
        <li>Richer built-in directives: <code>agent</code>, <code>environment</code>, <code>post</code>, <code>parameters</code>, <code>triggers</code>, <code>when</code></li>
      </ul>

      <h4>Scripted Pipeline</h4>
      <ul>
        <li>Starts with <code>node { }</code></li>
        <li>Full Groovy power — you write imperative code that controls the flow</li>
        <li>More flexible but higher ceremony — you manage checkpoints, error handling, and parallelism yourself</li>
        <li>Use when Declarative can't express your logic (rare for standard CI/CD)</li>
      </ul>

      <p>
        <strong>Rule of thumb:</strong> start with Declarative. Switch to Scripted only when you
        hit a genuine limitation — and document why.
      </p>
    `,
  },

  // ── Declarative pipeline anatomy ──────────────────────────────────────────

  {
    type: 'prose',
    title: 'Anatomy of a Declarative Pipeline',
    content: `
      <p>Every Declarative Jenkinsfile has this skeleton:</p>
      <pre><code>pipeline {
    agent any          // where the pipeline runs (or 'none' at top level)

    environment {      // variables available to all stages
        DOTNET_VERSION = '8.0'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm    // clone the repository
            }
        }
        stage('Build') {
            steps {
                sh 'dotnet build -c Release'   // shell command (sh for Linux, bat for Windows)
            }
        }
        stage('Test') {
            steps {
                sh 'dotnet test --no-build'
            }
        }
    }

    post {
        always {
            junit '**/TestResults.xml'    // archive test results (always runs)
        }
        success {
            echo 'Pipeline succeeded!'
        }
        failure {
            echo 'Pipeline failed — check the logs.'
        }
    }
}</code></pre>

      <p>Key directives explained:</p>
      <ul>
        <li><strong><code>pipeline { }</code></strong> — the outermost block; required.</li>
        <li><strong><code>agent</code></strong> — where the pipeline runs. <code>any</code> = any available agent; <code>none</code> = you'll specify per-stage; <code>label 'dotnet'</code> = only on agents with that label; <code>docker { image 'mcr.microsoft.com/dotnet/sdk:8.0' }</code> = run inside a container.</li>
        <li><strong><code>stages { stage('Name') { steps { ... } } }</code></strong> — the work is organised into named stages. Each stage is a logical phase (Checkout, Build, Test, Deploy).</li>
        <li><strong><code>steps</code></strong> — the actual commands: <code>sh</code> (Linux/macOS), <code>bat</code> (Windows), <code>powershell</code> (Windows), plus pipeline steps like <code>checkout</code>, <code>junit</code>, <code>archiveArtifacts</code>.</li>
        <li><strong><code>post</code></strong> — actions that run after the pipeline completes. Conditions: <code>always</code>, <code>success</code>, <code>failure</code>, <code>unstable</code>, <code>changed</code>.</li>
        <li><strong><code>environment</code></strong> — variables set at pipeline or stage scope. Access in shell as <code>$VARNAME</code>, in Groovy as <code>env.VARNAME</code>.</li>
        <li><strong><code>parameters</code></strong> — user-supplied values at build time (string, choice, boolean, password).</li>
        <li><strong><code>triggers</code></strong> — when the pipeline runs: <code>cron('H/30 * * * *')</code>, <code>pollSCM('H/5 * * * *')</code>.</li>
        <li><strong><code>when</code></strong> (inside a stage) — conditional stage execution: <code>when { branch 'main' }</code> (only run on main), <code>when { expression { env.DEPLOY_ENV == 'production' } }</code>.</li>
      </ul>
    `,
  },

  // ── .NET pipeline example ─────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Example: .NET 8 CI/CD Pipeline',
    content: `
      <p>A realistic Declarative pipeline for a .NET 8 Web API backed by PostgreSQL:</p>
      <pre><code>pipeline {
    agent { label 'dotnet' }           // run on a .NET agent

    environment {
        DOTNET_CLI_TELEMETRY_OPTOUT = '1'
        ASPNETCORE_ENVIRONMENT = 'Testing'
    }

    parameters {
        string(name: 'DEPLOY_ENV', defaultValue: 'staging', description: 'Deploy target')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Restore & Build') {
            steps {
                sh 'dotnet restore'
                sh 'dotnet build -c Release --no-restore'
            }
        }
        stage('Unit Tests') {
            steps {
                sh 'dotnet test tests/UnitTests -c Release --no-build --logger "trx;LogFileName=unit_results.trx"'
            }
            post {
                always {
                    junit 'tests/UnitTests/TestResults/unit_results.trx'
                }
            }
        }
        stage('Integration Tests (PostgreSQL)') {
            steps {
                sh '''
                    docker run -d --name pg-test -e POSTGRES_PASSWORD=test123 -p 5433:5432 postgres:16-alpine
                    sleep 5   # wait for PostgreSQL to be ready
                    pg_isready -h localhost -p 5433 -U postgres
                '''
                sh 'dotnet test tests/IntegrationTests -c Release --no-build --logger "trx;LogFileName=int_results.trx"'
            }
            post {
                always {
                    sh 'docker rm -f pg-test || true'
                    junit 'tests/IntegrationTests/TestResults/int_results.trx'
                }
            }
        }
        stage('Publish') {
            when { branch 'main' }
            steps {
                sh 'dotnet publish src/WebApi -c Release -o ./publish'
                archiveArtifacts artifacts: 'publish/**', fingerprint: true
            }
        }
        stage('Docker Build & Push') {
            when { branch 'main' }
            steps {
                sh 'docker build -t myorg/dotnet-api:${BUILD_NUMBER} -f src/WebApi/Dockerfile .'
                // sh 'docker push myorg/dotnet-api:${BUILD_NUMBER}'   // requires registry credentials
            }
        }
    }

    post {
        always {
            cleanWs()   // wipe the workspace to save disk space
        }
        success {
            echo "Pipeline ${env.JOB_NAME} #${env.BUILD_NUMBER} succeeded!"
        }
        failure {
            echo "Pipeline failed. Check ${env.BUILD_URL} for details."
        }
    }
}</code></pre>

      <p>What this pipeline does:</p>
      <ol>
        <li>Runs on any agent with the <code>dotnet</code> label</li>
        <li>Checks out the code</li>
        <li>Restores NuGet packages and compiles in Release mode</li>
        <li>Runs unit tests, archives results as JUnit XML</li>
        <li>Spins up a temporary PostgreSQL container, runs integration tests against it, tears it down</li>
        <li>On the <code>main</code> branch only: publishes the app and builds a Docker image</li>
        <li>Always cleans the workspace at the end</li>
      </ol>
    `,
  },

  // ── Node.js pipeline example ──────────────────────────────────────────────

  {
    type: 'prose',
    title: 'Example: Node.js CI/CD Pipeline',
    content: `
      <p>A Declarative pipeline for a Node.js Express API with PostgreSQL:</p>
      <pre><code>pipeline {
    agent { label 'nodejs' }

    environment {
        NODE_ENV = 'test'
        CI = 'true'
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Install') {
            steps {
                sh 'npm ci'   // clean install, respects lock file
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'npm test -- --coverage --reporters=default --reporters=jest-junit'
            }
            post {
                always {
                    junit 'junit.xml'
                }
            }
        }

        stage('Integration Tests (PostgreSQL)') {
            steps {
                sh '''
                    docker run -d --name pg-test \\
                        -e POSTGRES_DB=app_test \\
                        -e POSTGRES_USER=app_user \\
                        -e POSTGRES_PASSWORD=test123 \\
                        -p 5433:5432 postgres:16-alpine
                    sleep 5
                '''
                sh 'npm run test:integration'
            }
            post {
                always {
                    sh 'docker rm -f pg-test || true'
                }
            }
        }

        stage('Build') {
            when { branch 'main' }
            steps {
                sh 'npm run build'    // tsc, webpack, or next build
                archiveArtifacts artifacts: 'dist/**', fingerprint: true
            }
        }

        stage('Docker Build') {
            when { branch 'main' }
            steps {
                sh 'docker build -t myorg/node-api:${BUILD_NUMBER} .'
            }
        }
    }

    post {
        always { cleanWs() }
    }
}</code></pre>

      <p>
        The Node.js pipeline mirrors the .NET one structurally — the stages have the same names,
        the same PostgreSQL integration test pattern, and the same branch-gated publish logic.
        Only the tool-specific commands differ. This is intentional: teams with polyglot stacks
        benefit from a shared pipeline vocabulary.
      </p>
    `,
  },

  // ── Master–Slave pipeline (chained jobs) ──────────────────────────────────

  {
    type: 'prose',
    title: 'Chained Pipelines: Master Orchestrates, Slave Executes',
    content: `
      <p>
        A single Jenkinsfile can call another job using the <code>build</code> step. This lets
        you chain pipelines: a <strong>master pipeline</strong> orchestrates, and one or more
        <strong>slave pipelines</strong> do the work.
      </p>

      <h4>Master Pipeline (Pipeline-Master)</h4>
      <pre><code>pipeline {
    agent any

    stages {
        stage('Init') {
            steps {
                echo "Master: starting orchestration"
            }
        }
        stage('Build .NET API') {
            steps {
                build job: 'DOB-Demo/Pipeline-Dotnet', parameters: [
                    string(name: 'DEPLOY_ENV', value: 'staging')
                ]
            }
        }
        stage('Build Node.js API') {
            steps {
                build job: 'DOB-Demo/Pipeline-Nodejs', parameters: [
                    string(name: 'DEPLOY_ENV', value: 'staging')
                ]
            }
        }
        stage('Integration Tests') {
            steps {
                build job: 'DOB-Demo/Pipeline-Integration-Tests'
            }
        }
    }
}</code></pre>

      <h4>Slave Pipeline (Pipeline-Dotnet)</h4>
      <pre><code>pipeline {
    agent { label 'dotnet' }

    parameters {
        string(name: 'DEPLOY_ENV', defaultValue: 'staging')
    }

    stages {
        stage('Build') {
            steps {
                echo "Building for ${params.DEPLOY_ENV}"
                sh 'dotnet build -c Release'
            }
        }
        stage('Test') {
            steps {
                sh 'dotnet test -c Release --no-build'
            }
        }
    }
}</code></pre>

      <p>
        This pattern is powerful for microservice architectures: one master pipeline triggers
        individual service pipelines, then a separate integration-test pipeline validates the
        whole system. Each service pipeline can target a different agent label — .NET on CentOS,
        Node.js on Ubuntu, PostgreSQL migration on a dedicated DB agent.
      </p>
    `,
  },

  {
    type: 'note',
    variant: 'tip',
    content: `
      <strong>Local development tip.</strong> Use the <strong>Pipeline Syntax</strong> link in
      any Jenkins job's sidebar to generate pipeline step snippets interactively. Select a step
      (e.g. <code>git</code>, <code>junit</code>, <code>docker</code>), fill in the form, and
      Jenkins produces the correct Groovy syntax. This is the fastest way to learn the pipeline DSL.
    `,
  },

  // ── Where next ────────────────────────────────────────────────────────────

  {
    type: 'prose',
    title: 'From Pipelines to Production',
    content: `
      <p>
        You've now walked the full Jenkins journey: setup → jobs → slaves → Docker → pipelines.
        The final piece is the <strong>capstone homework</strong> — a complete CI/CD pipeline
        that checks out a .NET or Node.js application, builds it on a Jenkins agent, runs
        integration tests against PostgreSQL, containerises the result, and deploys it.
      </p>
      <p>
        This pipeline, committed as a Jenkinsfile alongside your application code, is exactly
        what professional development teams use every day. The tool you've learned here —
        Jenkins — is the same engine that builds software at Netflix, NASA, and thousands of
        organisations worldwide.
      </p>
    `,
  },

];
