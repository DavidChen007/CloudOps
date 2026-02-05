
package com.heitasoft.cloudops.entity.k8s;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "k8s_services")
public class K8sService {
    @Id
    private String id;

    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false)
    private String namespace;

    private String type; // ClusterIP, NodePort
    private String clusterIp;
    private String ports;
    private String status;
    private String age;
}
