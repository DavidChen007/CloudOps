
package com.heitasoft.cloudops.controller;

import com.heitasoft.cloudops.entity.k8s.*;
import com.heitasoft.cloudops.repository.k8s.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/k8s")
public class K8sController {

    @Autowired private K8sDeploymentRepository deploymentRepo;
    // Assume repositories exist for Pod, Service, Ingress similarly for brevity
    // In a full implementation, you would create repositories for all.

    @GetMapping("/deployments")
    public List<K8sDeployment> getDeployments() {
        return deploymentRepo.findAll();
    }

    @PostMapping("/deployments")
    public K8sDeployment createDeployment(@RequestBody K8sDeployment deployment) {
        return deploymentRepo.save(deployment);
    }

    // Mock endpoints for other resources to satisfy frontend structure
    // In real implementation, these would fetch from DB or K8s Client
}
