# IFDC Asset Management Platform

An enterprise-grade, multi-service asset management platform built with a focus on high availability and rigorous DevSecOps practices. 

This project utilizes a microservices architecture to handle inventory, user management, and AI-driven analytics, all secured by an automated, continuous security pipeline.

## 🏗️ Architecture Stack

* **Frontend:** React with TypeScript, Zustand for state management, built into an optimized Nginx container.
* **Backend Core:** Go (Golang) compiled into a statically linked, minimal-footprint Alpine Linux container.
* **AI Service:** Python (FastAPI) integrating generative AI capabilities, running in a hardened Debian slim environment.
* **Infrastructure:** Docker & Docker Compose for orchestration.

## 🛡️ DevSecOps & CI/CD Pipeline

Security is shifted completely to the left. Every push and pull request triggers a strict GitHub Actions workflow that prevents vulnerable code or compromised containers from reaching production.

### Continuous Integration (CI)
* Automated environment provisioning across three different language stacks (Node, Go, Python).
* Automated build verification and dependency resolution.
* Multi-stage Docker builds to ensure minimal runtime attack surfaces.

### Continuous Security (CS)
* **Static Application Security Testing (SAST):** Integrated **GitHub CodeQL** to automatically scan Go, Python, and TypeScript source code for injection flaws, weak cryptography, and hardcoded credentials.
* **Software Composition Analysis (SCA):** Integrated **Aqua Security Trivy** to scan built Docker images for zero-day vulnerabilities (CVEs) in base operating systems and transitive dependencies.
* **Aggressive Vulnerability Remediation:** * Targeted OS package upgrades via Alpine Edge repositories.
  * Surgical removal of vulnerable vendored build tools (`setuptools`, `wheel`) from the final Python runtime filesystem to achieve a distroless-style security posture.
  * Strict least-privilege enforcement via non-root user execution inside all containers.

## 🚀 Getting Started

### Prerequisites
* Docker
* Docker Compose

### Local Deployment
1. Clone the repository:
   ```bash
   git clone [https://github.com/AliWahaibi/ifdc-asset-management.git](https://github.com/AliWahaibi/ifdc-asset-management.git)