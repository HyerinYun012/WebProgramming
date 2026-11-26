package com.example.demo.repository;

import com.example.demo.entity.BehaviorLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BehaviorLogRepository extends JpaRepository<BehaviorLog, Long> {
    // 특정 익명 세션의 최근 행동 로그를 최신순으로 조회
    List<BehaviorLog> findTop20ByContextIdOrderByCreatedAtDesc(String contextId);

    // 세션 초기화 시 로그 삭제용
    void deleteByContextId(String contextId);
}
