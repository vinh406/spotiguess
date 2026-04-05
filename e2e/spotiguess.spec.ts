import { test, expect } from "@playwright/test";

const TEST_ROOM_CODE = "TEST123";

test.describe("Spotiguess E2E", () => {
  test("complete game flow - join room, import playlist, start game, see results", async ({
    page,
  }) => {
    // 1. Go directly to room page (skip OAuth)
    await page.goto(`/room/${TEST_ROOM_CODE}`);

    // 2. Enter username to join room
    const usernameInput = page.getByPlaceholder(/username/i);
    await expect(usernameInput).toBeVisible({ timeout: 10000 });
    await usernameInput.fill("TestPlayer");

    const joinBtn = page.getByRole("button", { name: /join/i });
    await expect(joinBtn).toBeVisible();
    await joinBtn.click();

    // 3. Wait for room page to load
    await expect(page.locator("text=Game Room")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=Room:")).toBeVisible();

    // 4. Open playlist modal
    const playlistBtn = page.getByText("Select Playlist").first();
    await expect(playlistBtn).toBeVisible();
    await playlistBtn.click();

    // 5. Import playlist from Spotify link
    const spotifyInput = page.getByPlaceholder(/spotify/i);
    await expect(spotifyInput).toBeVisible();
    await spotifyInput.fill(
      "https://open.spotify.com/playlist/3CoDoz8IKGn2uNTJJeVaSf?si=4b9a9e20216a4da8",
    );

    const importBtn = page.getByRole("button", { name: /import/i });
    await importBtn.click();

    // 6. Wait for import and close modal if still open
    await page.waitForTimeout(2000);

    // 7. Verify Select Playlist text is updated to show playlist name
    await expect(
      page.getByText(
        "very vulnerable rn if any goth girl would like to take advantage of me",
      ),
    ).toBeVisible();

    // 8. Open settings modal to set quick game settings
    const settingsBtn = page.getByText("Settings").first();
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // Click on 5 rounds (first button in the rounds section)
    await page.locator("button:has-text('5')").first().click();

    // Click on 5s time per round (first button in the time section)
    await page.locator("button:has-text('5s')").first().click();

    // Save settings
    const saveSettingsBtn = page.getByRole("button", { name: /save/i });
    await saveSettingsBtn.click();

    // Wait for settings to be applied
    await page.waitForTimeout(500);

    // 9. Click Start Game button (host)
    const startGameBtn = page.getByRole("button", { name: /start game/i });
    await expect(startGameBtn).toBeVisible();
    await startGameBtn.click();
    await page.waitForTimeout(3000); // Wait for game to start and first question to load

    // 10. Play through each round by clicking the first option
    let previousScore = 0;
    for (let round = 1; round <= 5; round++) {
      console.log(`Starting round ${round}...`);

      // Wait for answer options to appear
      await page.waitForTimeout(2000);

      // Click the first answer button (contains number "1")
      const firstOption = page.locator("button:has-text('1')").first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        console.log(`Clicked answer in round ${round}`);
      }

      // Wait for round end screen to appear
      try {
        await expect(page.locator("text=Round Complete")).toBeVisible({
          timeout: 10000,
        });
        console.log(`Round ${round} ended, looking for score...`);
      } catch (e) {
        console.log(`Round ${round}: Could not find round end screen`);
      }

      // Look for the actual score in the score display (green colored text)
      const greenScoreElement = page.locator("p.text-green-400").first();
      let currentScore = 0;
      if (await greenScoreElement.isVisible()) {
        const scoreText = await greenScoreElement.textContent();
        currentScore = scoreText ? parseInt(scoreText.replace(/\D/g, "")) : 0;
      }

      if (currentScore > previousScore) {
        console.log(
          `Round ${round}: CORRECT! Score: ${previousScore} → ${currentScore}`,
        );
      } else {
        console.log(`Round ${round}: Wrong answer. Score: ${currentScore}`);
      }
      previousScore = currentScore;

      if (round < 5) {
        // Click Next Round to proceed to next round
        console.log(`Looking for Next Round button...`);
        const nextBtn = page.getByRole("button", { name: /Next Round/i });
        await nextBtn.click();
        console.log(`Clicked Next Round button`);

        // Wait for next round to actually start (answer buttons appear again), unless this was the last round
        await expect(page.locator("button:has-text('1')").first()).toBeVisible({
          timeout: 10000,
        });
        console.log(`Round ${round + 1} is ready`);
        await page.waitForTimeout(1000);
      }
    }

    // 11. Wait for game to progress to Game End (if not already there)
    try {
      await expect(page.locator("text=Game Over")).toBeVisible({
        timeout: 30000,
      });
    } catch (e) {
      // If Game Over not visible, check if we need to click through more rounds
      const nextBtn = page.getByRole("button", {
        name: /Next Round|See Final Results/i,
      });
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
      }
      await expect(page.locator("text=Game Over")).toBeVisible({
        timeout: 30000,
      });
    }

    // 12. Verify final scores are displayed
    await expect(page.locator("text=Final Standings")).toBeVisible();

    // 13. Click Back to Lobby
    const backToLobbyBtn = page.getByRole("button", { name: /back to lobby/i });
    await expect(backToLobbyBtn).toBeVisible();
    await backToLobbyBtn.click();

    // 14. Verify we're back in lobby
    await expect(page.locator("text=Game Room")).toBeVisible();
    await expect(page.locator("text=Players")).toBeVisible();
  });
});
