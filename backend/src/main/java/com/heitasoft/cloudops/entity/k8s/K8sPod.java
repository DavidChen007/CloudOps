
package com.heitasoft.cloudops.entity.k8s;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "k8s_pods")
public class K8sPod {

    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String namespace;

    private Integer restarts;
    private String ip;
    private String status; // Running, Pending
    private String age;

    // 3NF: A Pod usually belongs to a controller (Deployment/ReplicaSet)
    // We map it loosely here by name convention or explicit ID if available
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deployment_id")
    private K8sDeployment deployment;
}
