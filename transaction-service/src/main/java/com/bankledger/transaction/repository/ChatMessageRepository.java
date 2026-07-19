package com.bankledger.transaction.repository;

import com.bankledger.transaction.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    @Query("SELECT m FROM ChatMessage m WHERE " +
           "(m.senderAccountId = :myAccountId AND m.recipientPhoneNumber = :recipientPhone) OR " +
           "(m.senderAccountId = :recipientAccountId AND m.recipientPhoneNumber = :myPhone) " +
           "ORDER BY m.createdAt ASC")
    List<ChatMessage> findChatHistory(
            @Param("myAccountId") UUID myAccountId,
            @Param("myPhone") String myPhone,
            @Param("recipientAccountId") UUID recipientAccountId,
            @Param("recipientPhone") String recipientPhone
    );

    @Query("SELECT DISTINCT m.recipientPhoneNumber FROM ChatMessage m WHERE m.senderAccountId = :myAccountId")
    List<String> findRecipientPhoneNumbersBySender(@Param("myAccountId") UUID myAccountId);

    @Query("SELECT DISTINCT m.senderAccountId FROM ChatMessage m WHERE m.recipientPhoneNumber = :myPhone")
    List<UUID> findSenderAccountIdsByRecipientPhone(@Param("myPhone") String myPhone);

    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE " +
           "m.senderAccountId = :recipientAccountId AND m.recipientPhoneNumber = :myPhone AND m.isRead = false")
    long countUnreadMessages(
            @Param("myPhone") String myPhone,
            @Param("recipientAccountId") UUID recipientAccountId
    );

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("UPDATE ChatMessage m SET m.isRead = true WHERE " +
           "m.senderAccountId = :recipientAccountId AND m.recipientPhoneNumber = :myPhone AND m.isRead = false")
    void markMessagesAsRead(
            @Param("myPhone") String myPhone,
            @Param("recipientAccountId") UUID recipientAccountId
    );
}
