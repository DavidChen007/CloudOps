
package com.heitasoft.cloudops.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "pipeline_configs")
public class PipelineConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Basic Git Info
    @Column(nullable = false)
    private String gitRepoUrl;

    @Column(nullable = false)
    private String gitBuildRef; // branch

    // Credentials (In production, passwords should be encrypted)
    private String credentialsId;
    private String credentialsPassword;

    // Docker Registry Info
    private String dockerUsername;
    private String dockerPassword;
    private String registryUrl; // e.g. registry.cn-shenzhen.aliyuncs.com

    // Image Configuration
    private String dockerImageName;
    private String dockerImageDirectory;
    private String dockerfilePath;

    // Runtime Config
    private String nodeOptions;
    
    @Column(nullable = false)
    private String stackType; // node, java, python

    // Deploy Target
    private String sshTarget;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
