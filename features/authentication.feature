Feature: Authentication
  As a user of the LLM web interface
  I want to be able to view the landing page, register an account, and log in/out
  So that I can securely access the application

  Scenario: Landing Page Access
    Given I am not logged in
    When I visit the application home page
    Then I should see the landing page with options to create an account or log in

  Scenario: Account Registration
    Given I am on the sign-up page
    When I enter valid account information and submit the form
    Then my account should be created and I should be able to log in

  Scenario: Local Log In and Log Out
    Given I already have an account
    When I enter valid Log In credentials
    Then I should be signed in to the application
    And when I click log out and confirm, I should return to a non-authenticated state
