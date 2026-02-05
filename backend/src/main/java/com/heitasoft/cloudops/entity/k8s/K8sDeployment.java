
package com.heitasoft.cloudops.entity.k8s;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "k8s_deployments")
public class K8sDeployment {

    @Id
    private String id; // 'd-timestamp'

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String namespace;

    private String replicas; // "3/3"
    private String status;   // Ready, Failed
    private String image;
    private String age;      // Descriptive string, or store createdAt

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
