
package com.heitasoft.cloudops.entity.k8s;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "k8s_ingresses")
public class K8sIngress {
    @Id
    private String id;

    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false)
    private String namespace;

    private String hosts;
    private String address;
    private String ports;
    private String status;
    private String age;
}
