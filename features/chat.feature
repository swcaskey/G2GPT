Feature: Chat with LLM
  As a logged-in user
  I want to be able to chat with an LLM and manage my conversation history
  So that I can get answers to my questions and refer back to previous conversations

  Scenario: Send a prompt and receive a response
    Given I am logged in and on the dashboard
    When I click the Models dropdown
    And I select a backend LLM from the available options
    And I enter a prompt in the chat box and click "Send"
    Then I should see my prompt and the LLM's response in the chat window

  Scenario: Conversation history is saved
    Given I have completed a chat session
    When I refresh the dashboard or log in again
    Then I should see my previous session listed in the history sidebar

  Scenario: Search conversation history
    Given I have multiple saved chats
    When I enter a keyword into the history search bar
    Then only the relevant matching sessions should be displayed in the sidebar

  Scenario: Resume a conversation from history
    Given I have saved conversations in my history
    When I click on a past conversation in the sidebar
    Then the conversation should be loaded into the chat window
