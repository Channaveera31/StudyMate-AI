// Enhanced Chatbot Integration for StudyMate AI
// Provides intelligent study assistance and real-time help

class StudyMateAI {
  constructor() {
    this.apiEndpoint = "https://api.openai.com/v1/chat/completions"; // Placeholder - use your preferred AI API
    this.conversationHistory = [];
    this.userContext = null;
    this.isTyping = false;
    this.initializeChatbot();
  }

  initializeChatbot() {
    this.createChatbotUI();
    this.bindChatbotEvents();
    this.loadConversationHistory();
  }

  createChatbotUI() {
    // Create floating chatbot button
    const chatbotButton = document.createElement("div");
    chatbotButton.id = "chatbotButton";
    chatbotButton.innerHTML = "🤖";
    chatbotButton.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 30px;
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 24px;
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
            z-index: 1000;
            transition: all 0.3s ease;
            animation: pulse 2s infinite;
        `;

    // Create chatbot modal
    const chatbotModal = document.createElement("div");
    chatbotModal.id = "chatbotModal";
    chatbotModal.style.cssText = `
            position: fixed;
            bottom: 150px;
            right: 30px;
            width: 350px;
            height: 500px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            z-index: 1001;
            display: none;
            flex-direction: column;
            overflow: hidden;
        `;

    chatbotModal.innerHTML = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 18px;">🤖 StudyMate AI</h3>
                    <button id="closeChatbot" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">×</button>
                </div>
                <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Your intelligent study assistant</p>
            </div>
            <div id="chatMessages" style="flex: 1; padding: 20px; overflow-y: auto; background: #f8f9ff;"></div>
            <div style="padding: 15px; background: white; border-top: 1px solid #eee;">
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="chatInput" placeholder="Ask me anything about studying..." 
                           style="flex: 1; padding: 12px; border: 2px solid #e0e0e0; border-radius: 25px; outline: none;">
                    <button id="sendMessage" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px 20px; border-radius: 25px; cursor: pointer;">
                        📤
                    </button>
                </div>
                <div id="quickActions" style="display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;"></div>
            </div>
        `;

    // Add pulse animation
    const style = document.createElement("style");
    style.textContent = `
            @keyframes pulse {
                0% { box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4); }
                50% { box-shadow: 0 4px 30px rgba(102, 126, 234, 0.6); }
                100% { box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4); }
            }
        `;
    document.head.appendChild(style);

    document.body.appendChild(chatbotButton);
    document.body.appendChild(chatbotModal);

    this.createQuickActions();
    this.showWelcomeMessage();
  }

  createQuickActions() {
    const quickActions = document.getElementById("quickActions");
    const actions = [
      { text: "📚 Study Tips", action: "study_tips" },
      { text: "⏰ Time Management", action: "time_management" },
      { text: "🧠 Memory Techniques", action: "memory_techniques" },
      { text: "📊 Track Progress", action: "track_progress" },
    ];

    actions.forEach((action) => {
      const button = document.createElement("button");
      button.textContent = action.text;
      button.style.cssText = `
                background: rgba(102, 126, 234, 0.1);
                border: 1px solid rgba(102, 126, 234, 0.3);
                color: #667eea;
                padding: 6px 12px;
                border-radius: 15px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
            `;
      button.addEventListener("click", () => {
        this.handleQuickAction(action.action);
      });
      quickActions.appendChild(button);
    });
  }

  bindChatbotEvents() {
    document.getElementById("chatbotButton").addEventListener("click", () => {
      this.toggleChatbot();
    });

    document.getElementById("closeChatbot").addEventListener("click", () => {
      this.closeChatbot();
    });

    document.getElementById("sendMessage").addEventListener("click", () => {
      this.sendMessage();
    });

    document.getElementById("chatInput").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.sendMessage();
      }
    });

    // Auto-resize based on screen size
    window.addEventListener("resize", () => {
      this.adjustChatbotSize();
    });
  }

  toggleChatbot() {
    const modal = document.getElementById("chatbotModal");
    const isVisible = modal.style.display === "flex";

    if (isVisible) {
      this.closeChatbot();
    } else {
      this.openChatbot();
    }
  }

  openChatbot() {
    const modal = document.getElementById("chatbotModal");
    modal.style.display = "flex";
    document.getElementById("chatInput").focus();

    // Update context with current user data
    if (window.app) {
      this.userContext = {
        schedules: window.app.schedules,
        user: window.app.currentUser,
        totalSubjects: window.app.schedules.length,
        completedTasks: this.getTotalCompletedTasks(),
      };
    }
  }

  closeChatbot() {
    const modal = document.getElementById("chatbotModal");
    modal.style.display = "none";
  }

  showWelcomeMessage() {
    const welcomeMessage = {
      text: "Hi! I'm your StudyMate AI assistant. I can help you with study planning, time management, and answering questions about your subjects. How can I help you today?",
      isBot: true,
      timestamp: new Date(),
    };
    this.displayMessage(welcomeMessage);
  }

  async sendMessage() {
    const input = document.getElementById("chatInput");
    const message = input.value.trim();

    if (!message) return;

    // Display user message
    this.displayMessage({
      text: message,
      isBot: false,
      timestamp: new Date(),
    });

    input.value = "";
    this.showTypingIndicator();

    // Get AI response
    const response = await this.getAIResponse(message);
    this.hideTypingIndicator();

    this.displayMessage({
      text: response,
      isBot: true,
      timestamp: new Date(),
    });

    this.saveConversationHistory();
  }

  displayMessage(message) {
    const messagesContainer = document.getElementById("chatMessages");
    const messageElement = document.createElement("div");

    messageElement.style.cssText = `
            margin-bottom: 15px;
            display: flex;
            ${
              message.isBot
                ? "justify-content: flex-start"
                : "justify-content: flex-end"
            };
        `;

    const messageBubble = document.createElement("div");
    messageBubble.style.cssText = `
            max-width: 80%;
            padding: 12px 16px;
            border-radius: 18px;
            ${
              message.isBot
                ? "background: white; color: #333; border: 1px solid #e0e0e0;"
                : "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;"
            }
            word-wrap: break-word;
            font-size: 14px;
            line-height: 1.4;
        `;

    messageBubble.textContent = message.text;
    messageElement.appendChild(messageBubble);
    messagesContainer.appendChild(messageElement);

    // Auto-scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    this.conversationHistory.push(message);
  }

  showTypingIndicator() {
    const messagesContainer = document.getElementById("chatMessages");
    const typingElement = document.createElement("div");
    typingElement.id = "typingIndicator";
    typingElement.style.cssText = `
            margin-bottom: 15px;
            display: flex;
            justify-content: flex-start;
        `;

    typingElement.innerHTML = `
            <div style="background: white; border: 1px solid #e0e0e0; padding: 12px 16px; border-radius: 18px; max-width: 80%;">
                <div style="display: flex; gap: 4px;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: #ccc; animation: bounce 1.4s infinite ease-in-out both;"></div>
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: #ccc; animation: bounce 1.4s infinite ease-in-out both; animation-delay: 0.16s;"></div>
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: #ccc; animation: bounce 1.4s infinite ease-in-out both; animation-delay: 0.32s;"></div>
                </div>
            </div>
        `;

    messagesContainer.appendChild(typingElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Add bounce animation
    if (!document.getElementById("bounceAnimation")) {
      const style = document.createElement("style");
      style.id = "bounceAnimation";
      style.textContent = `
                @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
                    40% { transform: scale(1); opacity: 1; }
                }
            `;
      document.head.appendChild(style);
    }
  }

  hideTypingIndicator() {
    const typingIndicator = document.getElementById("typingIndicator");
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  async getAIResponse(userMessage) {
    // Simulate AI processing with intelligent responses
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 + Math.random() * 2000)
    );

    const message = userMessage.toLowerCase();

    // Context-aware responses
    if (message.includes("study plan") || message.includes("schedule")) {
      return this.getStudyPlanAdvice();
    }

    if (
      message.includes("time management") ||
      message.includes("organize time")
    ) {
      return this.getTimeManagementTips();
    }

    if (
      message.includes("memory") ||
      message.includes("remember") ||
      message.includes("memorize")
    ) {
      return this.getMemoryTechniques();
    }

    if (
      message.includes("motivation") ||
      message.includes("motivated") ||
      message.includes("procrastination")
    ) {
      return this.getMotivationAdvice();
    }

    if (message.includes("progress") || message.includes("tracking")) {
      return this.getProgressInsights();
    }

    if (message.includes("exam") || message.includes("test")) {
      return this.getExamPreparationTips();
    }

    if (
      message.includes("stress") ||
      message.includes("anxiety") ||
      message.includes("overwhelmed")
    ) {
      return this.getStressManagementAdvice();
    }

    // Subject-specific help
    if (message.includes("physics")) {
      return "Physics can be challenging! Try breaking complex problems into smaller steps, use visual aids for concepts like waves and forces, and practice numerical problems daily. Would you like specific study techniques for any physics topic?";
    }

    if (message.includes("mathematics") || message.includes("math")) {
      return "Math requires consistent practice! Focus on understanding concepts rather than memorizing formulas. Work through problems step-by-step, and don't skip the basics. Practice a variety of problem types daily. Need help with any specific math topic?";
    }

    if (message.includes("chemistry")) {
      return "Chemistry combines theory and practical application. Create concept maps for reactions, use mnemonics for periodic table trends, and practice balancing equations regularly. Visual models help with molecular structures!";
    }

    // Default intelligent response
    return this.getGeneralStudyAdvice(userMessage);
  }

  getStudyPlanAdvice() {
    if (this.userContext && this.userContext.schedules.length > 0) {
      const upcomingExams = this.userContext.schedules.filter((s) => {
        const examDate = new Date(s.examDate);
        const daysLeft = Math.ceil(
          (examDate - new Date()) / (1000 * 60 * 60 * 24)
        );
        return daysLeft <= 30 && daysLeft > 0;
      });

      if (upcomingExams.length > 0) {
        const nextExam = upcomingExams.sort(
          (a, b) => new Date(a.examDate) - new Date(b.examDate)
        )[0];
        const daysLeft = Math.ceil(
          (new Date(nextExam.examDate) - new Date()) / (1000 * 60 * 60 * 24)
        );

        return `I see you have ${nextExam.subject} exam in ${daysLeft} days! Here's my advice:\n\n✅ Focus on high-yield topics first\n✅ Allocate more time to difficult concepts\n✅ Schedule regular review sessions\n✅ Take practice tests\n✅ Don't forget short breaks every hour\n\nWould you like me to suggest a specific daily routine?`;
      }
    }

    return "Great question about study planning! Here are key principles:\n\n📅 Set specific, measurable goals\n⏰ Use time-blocking techniques\n🎯 Prioritize based on difficulty and importance\n📊 Track your progress regularly\n🔄 Review and adjust your plan weekly\n\nWhat subject would you like help planning for?";
  }

  getTimeManagementTips() {
    return "Time management is crucial for academic success! Here are proven techniques:\n\n🍅 Pomodoro Technique: 25min focused study + 5min break\n📋 Priority Matrix: Urgent vs Important tasks\n⏰ Time-blocking: Schedule specific times for each subject\n🚫 Eliminate distractions: Phone, social media, noise\n✅ Use the 2-minute rule: If it takes <2min, do it now\n\nWhich technique would you like me to explain in detail?";
  }

  getMemoryTechniques() {
    return "Boost your memory with these proven techniques:\n\n🧠 Spaced Repetition: Review at increasing intervals\n🏠 Memory Palace: Associate info with familiar locations\n🔗 Mnemonics: Create memorable acronyms or phrases\n✍️ Active Recall: Test yourself without looking\n📖 Elaborative Rehearsal: Connect new info to existing knowledge\n🎨 Visual Association: Create mental images\n\nWhat type of information are you trying to memorize?";
  }

  getMotivationAdvice() {
    const motivationalTips = [
      "Remember your 'why' - visualize your goals and the life you want to build!",
      "Break large tasks into smaller wins. Every small step counts! 🎯",
      "Celebrate your progress, no matter how small. You're doing better than you think! 🎉",
      "Create a reward system for completed tasks. You deserve recognition! 🏆",
      "Find a study buddy or accountability partner. Together you're stronger! 👥",
      "Change your environment when you feel stuck. Fresh space, fresh mindset! 🔄",
    ];

    const tip =
      motivationalTips[Math.floor(Math.random() * motivationalTips.length)];
    return `${tip}\n\nRemember: Procrastination is often fear in disguise. Start with just 5 minutes, and momentum will build naturally. What's one small task you can do right now?`;
  }

  getProgressInsights() {
    if (this.userContext) {
      const totalTasks = this.getTotalTasks();
      const completedTasks = this.userContext.completedTasks;
      const progressRate =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return `📊 Your Progress Insights:\n\n✅ Completed Tasks: ${completedTasks}\n📝 Total Tasks: ${totalTasks}\n📈 Progress Rate: ${progressRate}%\n📚 Active Subjects: ${
        this.userContext.totalSubjects
      }\n\n${this.getProgressAdvice(progressRate)}`;
    }

    return "Tracking progress is essential for success! Here's how:\n\n📊 Use daily/weekly checklists\n📈 Monitor completion rates\n📝 Keep a study journal\n🎯 Set weekly goals\n🔄 Review and adjust regularly\n\nConsistent small progress beats sporadic big efforts!";
  }

  getProgressAdvice(progressRate) {
    if (progressRate >= 80) {
      return "🌟 Excellent work! You're on track. Keep maintaining this momentum!";
    } else if (progressRate >= 60) {
      return "👍 Good progress! Consider increasing daily study time slightly to stay ahead.";
    } else if (progressRate >= 40) {
      return "⚠️ You're falling behind. Let's focus on consistency and eliminate distractions.";
    } else {
      return "🚨 Time to refocus! Break tasks into smaller chunks and celebrate small wins.";
    }
  }

  getExamPreparationTips() {
    return "🎯 Exam Success Strategy:\n\n📚 BEFORE: Create summary notes, practice tests, review weak areas\n⏰ DURING: Read questions carefully, manage time, start with easy questions\n🧘 MINDSET: Stay calm, breathe deeply, trust your preparation\n\n✅ Final Week: Light review only, maintain sleep schedule\n✅ Day Before: No new material, relax, prepare materials\n✅ Exam Day: Arrive early, bring extra pens, stay positive\n\nWhat specific aspect of exam preparation concerns you most?";
  }

  getStressManagementAdvice() {
    return "🧘 Managing Study Stress:\n\n💆 Physical: Regular exercise, proper sleep, healthy meals\n🧠 Mental: Meditation, deep breathing, positive self-talk\n⚖️ Balance: Schedule breaks, social time, hobbies\n📞 Support: Talk to friends, family, or counselors\n\n🌟 Remember: Some stress is normal and can improve performance. The key is balance!\n\nTry the 4-7-8 breathing technique: Inhale 4 seconds, hold 7, exhale 8. Instant calm!";
  }

  getGeneralStudyAdvice(userMessage) {
    const generalAdvice = [
      "That's a great question! The key to effective studying is consistency and active engagement. What specific area would you like help with?",
      "Every student's journey is unique! Focus on understanding concepts deeply rather than just memorizing. How can I help you with your specific subject?",
      "Learning is a process, not a destination. Be patient with yourself and celebrate small victories. What's your biggest challenge right now?",
      "The best study method is the one that works for you! Experiment with different techniques. What subjects are you working on?",
      "Quality over quantity - focused study sessions are more effective than long, distracted ones. What would you like to focus on today?",
    ];

    return generalAdvice[Math.floor(Math.random() * generalAdvice.length)];
  }

  handleQuickAction(action) {
    const responses = {
      study_tips: () =>
        this.displayMessage({
          text: this.getGeneralStudyTips(),
          isBot: true,
          timestamp: new Date(),
        }),
      time_management: () =>
        this.displayMessage({
          text: this.getTimeManagementTips(),
          isBot: true,
          timestamp: new Date(),
        }),
      memory_techniques: () =>
        this.displayMessage({
          text: this.getMemoryTechniques(),
          isBot: true,
          timestamp: new Date(),
        }),
      track_progress: () =>
        this.displayMessage({
          text: this.getProgressInsights(),
          isBot: true,
          timestamp: new Date(),
        }),
    };

    if (responses[action]) {
      responses[action]();
    }
  }

  getGeneralStudyTips() {
    return "🌟 Top Study Tips for Success:\n\n📚 Active Learning: Summarize, question, teach others\n🔄 Spaced Repetition: Review material at intervals\n🎯 Goal Setting: Set SMART (Specific, Measurable) goals\n🌅 Morning Study: Your brain is freshest in AM\n📱 Digital Detox: Remove distractions during study\n💧 Stay Hydrated: Water boosts cognitive function\n🚶 Take Breaks: 50min study + 10min break works well\n\nWhich tip would you like me to elaborate on?";
  }

  getTotalCompletedTasks() {
    if (!this.userContext || !this.userContext.schedules) return 0;

    return this.userContext.schedules.reduce((total, schedule) => {
      if (!schedule.plan) return total;
      return (
        total +
        schedule.plan.reduce((dayTotal, day) => {
          return dayTotal + day.tasks.filter((task) => task.completed).length;
        }, 0)
      );
    }, 0);
  }

  getTotalTasks() {
    if (!this.userContext || !this.userContext.schedules) return 0;

    return this.userContext.schedules.reduce((total, schedule) => {
      if (!schedule.plan) return total;
      return (
        total +
        schedule.plan.reduce((dayTotal, day) => {
          return dayTotal + day.tasks.length;
        }, 0)
      );
    }, 0);
  }

  adjustChatbotSize() {
    const modal = document.getElementById("chatbotModal");
    if (window.innerWidth <= 768) {
      modal.style.cssText = `
                position: fixed;
                bottom: 0;
                right: 0;
                left: 0;
                width: 100%;
                height: 70vh;
                background: white;
                border-radius: 20px 20px 0 0;
                box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.15);
                z-index: 1001;
                display: none;
                flex-direction: column;
                overflow: hidden;
            `;
    }
  }

  saveConversationHistory() {
    localStorage.setItem(
      "chatbot_history",
      JSON.stringify(this.conversationHistory)
    );
  }

  loadConversationHistory() {
    const saved = localStorage.getItem("chatbot_history");
    if (saved) {
      this.conversationHistory = JSON.parse(saved);
      // Restore last few messages (optional)
      const recentMessages = this.conversationHistory.slice(-5);
      recentMessages.forEach((message) => {
        if (
          message.text !==
          "Hi! I'm your StudyMate AI assistant. I can help you with study planning, time management, and answering questions about your subjects. How can I help you today?"
        ) {
          this.displayMessage(message);
        }
      });
    }
  }

  // Real-time notifications based on user activity
  checkForSmartNotifications() {
    if (!window.app || !this.userContext) return;

    const now = new Date();
    const currentHour = now.getHours();

    // Study reminder during optimal hours
    if (
      (currentHour >= 9 && currentHour <= 11) ||
      (currentHour >= 14 && currentHour <= 16)
    ) {
      const hasStudiedToday = this.checkTodayProgress();
      if (!hasStudiedToday) {
        this.sendSmartNotification(
          "🌟 Perfect time to study! Your brain is at peak performance right now."
        );
      }
    }

    // Exam proximity warnings
    this.userContext.schedules.forEach((schedule) => {
      const examDate = new Date(schedule.examDate);
      const daysLeft = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
      const progress = this.calculateScheduleProgress(schedule);

      if (daysLeft <= 7 && progress < 70) {
        this.sendSmartNotification(
          `⚠️ ${schedule.subject} exam in ${daysLeft} days! You're at ${progress}% completion. Time to focus!`
        );
      }
    });
  }

  sendSmartNotification(message) {
    // Only show if chatbot isn't already open
    const modal = document.getElementById("chatbotModal");
    if (modal.style.display !== "flex") {
      const notification = document.createElement("div");
      notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 20px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
                z-index: 1002;
                max-width: 300px;
                cursor: pointer;
                animation: slideIn 0.3s ease;
            `;

      notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div>🤖</div>
                    <div style="font-size: 14px;">${message}</div>
                </div>
            `;

      notification.addEventListener("click", () => {
        this.openChatbot();
        notification.remove();
      });

      document.body.appendChild(notification);

      // Auto-remove after 10 seconds
      setTimeout(() => {
        if (document.body.contains(notification)) {
          notification.remove();
        }
      }, 10000);
    }
  }

  checkTodayProgress() {
    const today = new Date().toISOString().split("T")[0];
    // Check if user has completed any tasks today
    return this.userContext.schedules.some((schedule) => {
      if (!schedule.plan) return false;
      return schedule.plan.some((day) => {
        return day.date === today && day.tasks.some((task) => task.completed);
      });
    });
  }

  calculateScheduleProgress(schedule) {
    if (!schedule.plan) return 0;

    let totalTasks = 0;
    let completedTasks = 0;

    schedule.plan.forEach((day) => {
      totalTasks += day.tasks.length;
      completedTasks += day.tasks.filter((t) => t.completed).length;
    });

    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  }

  startSmartNotifications() {
    // Check for smart notifications every 30 minutes
    setInterval(() => {
      this.checkForSmartNotifications();
    }, 30 * 60 * 1000);

    // Initial check after 5 seconds
    setTimeout(() => {
      this.checkForSmartNotifications();
    }, 5000);
  }
}

// Initialize chatbot when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.studyMateAI = new StudyMateAI();

  // Start smart notifications after app is loaded
  setTimeout(() => {
    if (window.studyMateAI) {
      window.studyMateAI.startSmartNotifications();
    }
  }, 3000);
});

// Add slide-in animation
const slideInStyle = document.createElement("style");
slideInStyle.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(slideInStyle);
