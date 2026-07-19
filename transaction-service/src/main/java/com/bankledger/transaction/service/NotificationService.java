package com.bankledger.transaction.service;

import com.bankledger.transaction.model.Notification;
import com.bankledger.transaction.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Transactional
    public void createNotification(UUID accountId, String title, String message) {
        Notification notification = Notification.builder()
                .id(UUID.randomUUID())
                .accountId(accountId)
                .title(title)
                .message(message)
                .isRead(false)
                .build();
        notificationRepository.save(notification);
    }

    public List<Notification> getNotificationsForAccount(UUID accountId) {
        return notificationRepository.findByAccountIdOrderByCreatedAtDesc(accountId);
    }

    public long getUnreadCount(UUID accountId) {
        return notificationRepository.countByAccountIdAndIsReadFalse(accountId);
    }

    @Transactional
    public void markAsRead(UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(UUID accountId) {
        List<Notification> unread = notificationRepository.findByAccountIdOrderByCreatedAtDesc(accountId);
        for (Notification n : unread) {
            if (!n.isRead()) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        }
    }
}
