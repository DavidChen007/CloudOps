
package com.heitasoft.cloudops.controller;

import com.heitasoft.cloudops.entity.JenkinsJob;
import com.heitasoft.cloudops.repository.JenkinsJobRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/jenkins")
public class JenkinsController {

    @Autowired
    private JenkinsJobRepository repository;

    @GetMapping("/jobs")
    public List<JenkinsJob> getJobs() {
        return repository.findAll();
    }

    @PostMapping("/jobs")
    public JenkinsJob createJob(@RequestBody JenkinsJob job) {
        if (job.getId() == null) {
            job.setId("j-" + System.currentTimeMillis());
        }
        job.setLastTime(LocalDateTime.now());
        return repository.save(job);
    }

    @PostMapping("/build/{id}")
    public JenkinsJob triggerBuild(@PathVariable String id) {
        Optional<JenkinsJob> jobOpt = repository.findById(id);
        if (jobOpt.isPresent()) {
            JenkinsJob job = jobOpt.get();
            job.setStatus("IN_PROGRESS");
            job.setLastDuration("Running...");
            return repository.save(job);
        }
        throw new RuntimeException("Job not found");
    }
}
