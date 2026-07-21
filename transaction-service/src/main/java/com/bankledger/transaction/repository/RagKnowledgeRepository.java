package com.bankledger.transaction.repository;

import com.bankledger.transaction.model.RagKnowledgeBase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RagKnowledgeRepository extends JpaRepository<RagKnowledgeBase, String> {

    @Query("SELECT r FROM RagKnowledgeBase r WHERE " +
           "LOWER(r.keywords) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(r.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(r.content) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<RagKnowledgeBase> searchByKeyword(@Param("keyword") String keyword);
}
