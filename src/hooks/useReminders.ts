import { useEffect, useRef } from 'react';
import { Meeting, Event, Birthday, Task } from '../constants';
import { useNotifications } from './useNotifications';

export function useReminders(meetings: Meeting[], events: Event[], birthdays: Birthday[], tasks: Task[] = []) {
  const { addNotification } = useNotifications();
  const processedReminders = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentYear = now.getFullYear();

      // Check Meetings
      // ... (existing code)
      meetings.forEach(meeting => {
        if (!meeting.date || !meeting.time) return;
        
        const meetingDate = new Date(`${meeting.date}T${meeting.time}`);
        const reminderValue = meeting.reminderValue || 30;
        const reminderType = meeting.reminderType || 'minutes';
        
        if (reminderType === 'none') return;

        let reminderTime = new Date(meetingDate);
        if (reminderType === 'minutes') {
          reminderTime.setMinutes(reminderTime.getMinutes() - reminderValue);
        } else if (reminderType === 'hours') {
          reminderTime.setHours(reminderTime.getHours() - reminderValue);
        } else if (reminderType === 'days') {
          reminderTime.setDate(reminderTime.getDate() - reminderValue);
        }

        const reminderId = `meeting-${meeting.id}-${reminderTime.getTime()}`;
        
        if (now >= reminderTime && (now.getTime() - reminderTime.getTime()) < 300000 && !processedReminders.current.has(reminderId)) {
          addNotification({
            title: 'Nhắc nhở lịch họp',
            description: `Cuộc họp "${meeting.name}" sẽ diễn ra vào lúc ${meeting.time} ngày ${meeting.date}.`,
            type: 'info',
            link: 'calendar'
          });
          processedReminders.current.add(reminderId);
        }
      });

      // Check Events
      events.forEach(event => {
        if (!event.date) return;
        
        const eventTimeStr = event.time || '09:00';
        const eventDate = new Date(`${event.date}T${eventTimeStr}`);
        const reminderValue = event.reminderValue || 30;
        const reminderType = event.reminderType || 'minutes';
        
        if (reminderType === 'none') return;

        let reminderTime = new Date(eventDate);
        if (reminderType === 'minutes') {
          reminderTime.setMinutes(reminderTime.getMinutes() - reminderValue);
        } else if (reminderType === 'hours') {
          reminderTime.setHours(reminderTime.getHours() - reminderValue);
        } else if (reminderType === 'days') {
          reminderTime.setDate(reminderTime.getDate() - reminderValue);
        }

        const reminderId = `event-${event.id}-${reminderTime.getTime()}`;
        
        if (now >= reminderTime && (now.getTime() - reminderTime.getTime()) < 300000 && !processedReminders.current.has(reminderId)) {
          const typeLabel = event.type === 'anniversary' ? 'Kỷ niệm' : event.type === 'holiday' ? 'Ngày lễ' : 'Sự kiện';
          addNotification({
            title: `Nhắc nhở ${typeLabel}`,
            description: `${typeLabel} "${event.name}" sẽ diễn ra vào lúc ${eventTimeStr} ngày ${event.date}.`,
            type: 'info',
            link: 'calendar'
          });
          processedReminders.current.add(reminderId);
        }
      });

      // Check Tasks
      tasks.forEach(task => {
        if (!task.deadline || task.status === 'Completed') return;
        
        // Tasks default to 09:00 AM for deadline day reminder
        const taskDate = new Date(`${task.deadline}T09:00:00`);
        const reminderValue = task.reminderValue || 30;
        const reminderType = task.reminderType || 'minutes';
        
        if (reminderType === 'none') return;

        let reminderTime = new Date(taskDate);
        if (reminderType === 'minutes') {
          reminderTime.setMinutes(reminderTime.getMinutes() - reminderValue);
        } else if (reminderType === 'hours') {
          reminderTime.setHours(reminderTime.getHours() - reminderValue);
        } else if (reminderType === 'days') {
          reminderTime.setDate(reminderTime.getDate() - reminderValue);
        }

        const reminderId = `task-${task.id}-${reminderTime.getTime()}`;
        
        if (now >= reminderTime && (now.getTime() - reminderTime.getTime()) < 300000 && !processedReminders.current.has(reminderId)) {
          addNotification({
            title: 'Nhắc nhở nhiệm vụ',
            description: `Nhiệm vụ "${task.title}" có hạn chót vào ngày ${task.deadline}. Hãy khẩn trương hoàn thành.`,
            type: 'warning',
            link: 'calendar'
          });
          processedReminders.current.add(reminderId);
        }
      });

      // Check Birthdays
      birthdays.forEach(birthday => {
        if (!birthday.date) return;
        
        // Parse date (DD/MM/YYYY or DD/MM)
        const parts = birthday.date.split('/');
        if (parts.length < 2) return;
        
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        
        const birthdayDate = new Date(currentYear, month, day, 9, 0); // Default to 9 AM
        const reminderValue = birthday.reminderValue || 1;
        const reminderType = birthday.reminderType || 'days'; // Default to 1 day before
        
        if (reminderType === 'none') return;

        let reminderTime = new Date(birthdayDate);
        if (reminderType === 'minutes') {
          reminderTime.setMinutes(reminderTime.getMinutes() - reminderValue);
        } else if (reminderType === 'hours') {
          reminderTime.setHours(reminderTime.getHours() - reminderValue);
        } else if (reminderType === 'days') {
          reminderTime.setDate(reminderTime.getDate() - reminderValue);
        }

        const reminderId = `birthday-${birthday.id}-${reminderTime.getTime()}`;
        
        if (now >= reminderTime && (now.getTime() - reminderTime.getTime()) < 300000 && !processedReminders.current.has(reminderId)) {
          addNotification({
            title: 'Nhắc nhở sinh nhật',
            description: `Hôm nay là sinh nhật của ${birthday.name} (${birthday.date}).`,
            type: 'info',
            link: 'calendar'
          });
          processedReminders.current.add(reminderId);
        }
      });

      // Check Preparation for Tomorrow (Professional Feature)
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      const tomorrowMeetings = meetings.filter(m => m.date === tomorrowStr);
      const tomorrowEvents = events.filter(e => e.date === tomorrowStr);
      
      if (tomorrowMeetings.length > 0 || tomorrowEvents.length > 0) {
        const prepReminderId = `prep-tomorrow-${tomorrowStr}`;
        
        // Only remind in the afternoon (after 16:00) to prepare for tomorrow
        if (now.getHours() >= 16 && !processedReminders.current.has(prepReminderId)) {
          const totalItems = tomorrowMeetings.length + tomorrowEvents.length;
          addNotification({
            title: 'Chuẩn bị cho ngày mai',
            description: `Đồng chí có ${totalItems} sự kiện quan trọng vào ngày mai (${tomorrowStr}). Hãy kiểm tra tài liệu và nội dung tham mưu cần thiết.`,
            type: 'warning',
            link: 'calendar'
          });
          processedReminders.current.add(prepReminderId);
        }
      }

      // Check Sunday 18:00 Weekly Schedule Upload Reminder
      // If it's Sunday after 18:00 and no meetings/events for the upcoming week
      if (now.getDay() === 0 && now.getHours() >= 18) {
        const nextWeekStart = new Date(now);
        nextWeekStart.setDate(now.getDate() + 1); // Monday
        const nextWeekEnd = new Date(now);
        nextWeekEnd.setDate(now.getDate() + 7); // Next Sunday
        
        const hasUpcomingSchedule = meetings.some(m => {
          const d = new Date(m.date);
          return d >= nextWeekStart && d <= nextWeekEnd;
        }) || events.some(e => {
          const d = new Date(e.date);
          return d >= nextWeekStart && d <= nextWeekEnd;
        });

        const sundayReminderId = `sunday-upload-reminder-${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
        
        if (!hasUpcomingSchedule && !processedReminders.current.has(sundayReminderId)) {
          addNotification({
            title: 'Nhắc nhở cập nhật lịch tuần',
            description: 'Đã quá 18h Chủ nhật nhưng hệ thống chưa thấy lịch làm việc cho tuần tới. Đồng chí hãy upload lịch để trợ lý AI hỗ trợ tốt nhất.',
            type: 'warning',
            link: 'calendar'
          });
          processedReminders.current.add(sundayReminderId);
        }
      }
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    checkReminders(); // Initial check

    return () => clearInterval(interval);
  }, [meetings, events, birthdays, addNotification]);
}
