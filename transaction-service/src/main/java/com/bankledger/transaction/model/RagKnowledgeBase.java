package com.bankledger.transaction.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "rag_knowledge_base")
public class RagKnowledgeBase {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    @Column(name = "category", nullable = false, length = 50)
    private String category;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "keywords", nullable = false, columnDefinition = "TEXT")
    private String keywords;

    @Column(name = "source_document", nullable = false, length = 100)
    private String sourceDocument;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public RagKnowledgeBase() {}

    public RagKnowledgeBase(String id, String category, String title, String content, String keywords, String sourceDocument) {
        this.id = id;
        this.category = category;
        this.title = title;
        this.content = content;
        this.keywords = keywords;
        this.sourceDocument = sourceDocument;
        this.updatedAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getKeywords() { return keywords; }
    public void setKeywords(String keywords) { this.keywords = keywords; }

    public String getSourceDocument() { return sourceDocument; }
    public void setSourceDocument(String sourceDocument) { this.sourceDocument = sourceDocument; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
