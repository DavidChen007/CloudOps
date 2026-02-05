
package com.heitasoft.cloudops.repository.k8s;

import com.heitasoft.cloudops.entity.k8s.K8sPod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface K8sPodRepository extends JpaRepository<K8sPod, String> {
}
