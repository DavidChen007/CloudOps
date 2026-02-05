
-- Create Database
CREATE DATABASE IF NOT EXISTS cloudops_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cloudops_db;

-- Disable foreign key checks for dropping tables
SET FOREIGN_KEY_CHECKS = 0;

-- Drop existing tables
DROP TABLE IF EXISTS k8s_pods;
DROP TABLE IF EXISTS k8s_deployments;
DROP TABLE IF EXISTS k8s_services;
DROP TABLE IF EXISTS k8s_ingresses;
DROP TABLE IF EXISTS jenkins_jobs;
DROP TABLE IF EXISTS pipeline_configs;

-- Enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Table: Pipeline Configs
-- Stores the configuration for CI/CD pipelines created via the Wizard
CREATE TABLE pipeline_configs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    git_repo_url VARCHAR(255) NOT NULL,
    git_build_ref VARCHAR(100) NOT NULL COMMENT 'Branch or Tag',
    
    credentials_id VARCHAR(100),
    credentials_password VARCHAR(255),
    
    docker_username VARCHAR(100),
    docker_password VARCHAR(255),
    registry_url VARCHAR(255),
    
    docker_image_name VARCHAR(100),
    docker_image_directory VARCHAR(100),
    dockerfile_path VARCHAR(255),
    
    node_options VARCHAR(255),
    stack_type VARCHAR(50) NOT NULL COMMENT 'node, java, python',
    ssh_target VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Table: Jenkins Jobs
-- Stores job execution status, linked optionally to a specific pipeline config
CREATE TABLE jenkins_jobs (
    id VARCHAR(50) PRIMARY KEY COMMENT 'String ID like j-123',
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) COMMENT 'SUCCESS, FAILURE, IN_PROGRESS, ABORTED',
    last_duration VARCHAR(50),
    last_build VARCHAR(50),
    branch VARCHAR(100),
    last_time TIMESTAMP,
    pipeline_config_id BIGINT,
    
    CONSTRAINT fk_jenkins_pipeline 
        FOREIGN KEY (pipeline_config_id) REFERENCES pipeline_configs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Table: K8s Deployments
-- Stores Kubernetes Deployment resources
CREATE TABLE k8s_deployments (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    namespace VARCHAR(100) NOT NULL,
    replicas VARCHAR(20),
    status VARCHAR(50),
    image VARCHAR(255),
    age VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Table: K8s Pods
-- Stores Kubernetes Pods, linked to a Deployment
CREATE TABLE k8s_pods (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    namespace VARCHAR(100) NOT NULL,
    restarts INT DEFAULT 0,
    ip VARCHAR(50),
    status VARCHAR(50),
    age VARCHAR(50),
    deployment_id VARCHAR(50),
    
    CONSTRAINT fk_pod_deployment
        FOREIGN KEY (deployment_id) REFERENCES k8s_deployments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Table: K8s Services
-- Stores Kubernetes Service resources
CREATE TABLE k8s_services (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    namespace VARCHAR(100) NOT NULL,
    type VARCHAR(50) COMMENT 'ClusterIP, NodePort, LoadBalancer',
    cluster_ip VARCHAR(50),
    ports VARCHAR(255),
    status VARCHAR(50),
    age VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Table: K8s Ingresses
-- Stores Kubernetes Ingress resources
CREATE TABLE k8s_ingresses (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    namespace VARCHAR(100) NOT NULL,
    hosts VARCHAR(512),
    address VARCHAR(100),
    ports VARCHAR(100),
    status VARCHAR(50),
    age VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Initial Seed Data (Optional - mimicking frontend mocks)
INSERT INTO k8s_deployments (id, name, namespace, replicas, status, image, age) VALUES 
('1', 'mfx-admin-deploy', 'production', '3/3', 'Ready', 'heitasoft/mfx-admin:2024-05-20', '12d'),
('2', 'auth-service', 'production', '2/2', 'Ready', 'heitasoft/auth:v1.2.3', '5d');

INSERT INTO k8s_pods (id, name, namespace, restarts, ip, status, age, deployment_id) VALUES 
('p1', 'mfx-admin-6d5f-abc1', 'production', 0, '10.244.1.12', 'Running', '12d', '1'),
('p2', 'mfx-admin-6d5f-abc2', 'production', 2, '10.244.1.13', 'Running', '12d', '1'),
('p3', 'auth-service-7f8a-xyz1', 'production', 0, '10.244.2.45', 'Running', '5d', '2');

