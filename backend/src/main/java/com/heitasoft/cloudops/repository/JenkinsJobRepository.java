
package com.heitasoft.cloudops.repository;

import com.heitasoft.cloudops.entity.JenkinsJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JenkinsJobRepository extends JpaRepository<JenkinsJob, String> {
}
