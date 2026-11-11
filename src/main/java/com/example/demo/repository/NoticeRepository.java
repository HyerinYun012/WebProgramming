package com.example.demo.repository;

import com.example.demo.entity.Notice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NoticeRepository extends JpaRepository<Notice, String> {
    // 기본 save(), findAll() 등이 자동 제공됩니다!
}
