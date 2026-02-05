
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
    @Autowired private K8sPodRepository podRepo;
    @Autowired private K8sServiceRepository serviceRepo;
    @Autowired private K8sIngressRepository ingressRepo;

    @GetMapping("/deployments")
    public List<K8sDeployment> getDeployments() {
        return deploymentRepo.findAll();
    }

    @PostMapping("/deployments")
    public K8sDeployment createDeployment(@RequestBody K8sDeployment deployment) {
        return deploymentRepo.save(deployment);
    }

    @GetMapping("/pods")
    public List<K8sPod> getPods() {
        return podRepo.findAll();
    }

    @GetMapping("/services")
    public List<K8sService> getServices() {
        return serviceRepo.findAll();
    }

    @GetMapping("/ingresses")
    public List<K8sIngress> getIngresses() {
        return ingressRepo.findAll();
    }
}
