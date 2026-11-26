package com.example.demo.repository;

import com.example.demo.entity.AnonymousContext;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AnonymousContextRepository extends JpaRepository<AnonymousContext, String> {
}
