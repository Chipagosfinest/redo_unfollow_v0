import { test, expect } from '@playwright/test'

test.describe('Farcaster Unfollow App - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Farcaster environment
    await page.addInitScript(() => {
      Object.defineProperty(window, 'farcaster', {
        value: {
          user: {
            fid: 12345,
            username: 'testuser',
          },
          signMessage: () => Promise.resolve(new Uint8Array(32)),
          getPublicKey: () => Promise.resolve(new Uint8Array(64)),
        },
        writable: true,
      })
    })
  })

  test('should load main page and show Farcaster connection', async ({ page }) => {
    await page.goto('/')
    
    // Should show Farcaster branding
    await expect(page.getByText(/farcaster/i)).toBeVisible()
    
    // Should show connect button or auto-connect
    await expect(page.getByRole('button')).toBeVisible()
  })

  test('should navigate to tool page and show following list', async ({ page }) => {
    await page.goto('/tool')
    
    // Should show tool interface
    await expect(page.getByText(/following/i)).toBeVisible()
    
    // Should show loading state initially
    await expect(page.getByText(/loading/i)).toBeVisible()
  })

  test('should handle authentication flow', async ({ page }) => {
    await page.goto('/tool')
    
    // Mock successful authentication
    await page.route('**/api/following**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          following: [
            {
              fid: 1,
              username: 'user1',
              displayName: 'User One',
              pfp: { url: 'avatar1.jpg' },
              followerCount: 100,
              followingCount: 50,
            }
          ],
          totalPages: 1,
          totalFollowing: 1,
        })
      })
    })

    // Should show user data after authentication
    await expect(page.getByText('User One')).toBeVisible()
  })

  test('should allow selecting users for unfollow', async ({ page }) => {
    await page.goto('/tool')
    
    // Mock following data
    await page.route('**/api/following**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          following: [
            {
              fid: 1,
              username: 'user1',
              displayName: 'User One',
              pfp: { url: 'avatar1.jpg' },
              followerCount: 100,
              followingCount: 50,
            }
          ],
          totalPages: 1,
          totalFollowing: 1,
        })
      })
    })

    // Wait for user to load
    await expect(page.getByText('User One')).toBeVisible()
    
    // Click checkbox to select user
    const checkbox = page.locator('input[type="checkbox"]').first()
    await checkbox.check()
    
    // Should show unfollow button
    await expect(page.getByText(/unfollow/i)).toBeVisible()
  })

  test('should handle batch unfollow operation', async ({ page }) => {
    await page.goto('/tool')
    
    // Mock following data with multiple users
    await page.route('**/api/following**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          following: [
            {
              fid: 1,
              username: 'user1',
              displayName: 'User One',
              pfp: { url: 'avatar1.jpg' },
              followerCount: 100,
              followingCount: 50,
            },
            {
              fid: 2,
              username: 'user2',
              displayName: 'User Two',
              pfp: { url: 'avatar2.jpg' },
              followerCount: 200,
              followingCount: 100,
            }
          ],
          totalPages: 1,
          totalFollowing: 2,
        })
      })
    })

    // Mock unfollow API
    await page.route('**/api/unfollow**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Unfollow request processed',
        })
      })
    })

    // Wait for users to load
    await expect(page.getByText('User One')).toBeVisible()
    await expect(page.getByText('User Two')).toBeVisible()
    
    // Select both users
    const checkboxes = page.locator('input[type="checkbox"]')
    await checkboxes.nth(0).check()
    await checkboxes.nth(1).check()
    
    // Click unfollow button
    await page.getByText(/unfollow selected/i).click()
    
    // Should show progress
    await expect(page.getByText(/unfollowing/i)).toBeVisible()
  })

  test('should show error states gracefully', async ({ page }) => {
    await page.goto('/tool')
    
    // Mock API error
    await page.route('**/api/following**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Failed to load following list',
        })
      })
    })

    // Should show error message
    await expect(page.getByText(/error/i)).toBeVisible()
  })

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/tool')
    
    // Should be responsive
    await expect(page.getByText(/following/i)).toBeVisible()
    
    // Check touch interactions work
    const checkbox = page.locator('input[type="checkbox"]').first()
    await checkbox.tap()
  })

  test('should handle network failures gracefully', async ({ page }) => {
    await page.goto('/tool')
    
    // Mock network failure
    await page.route('**/api/following**', async route => {
      await route.abort()
    })

    // Should show appropriate error state
    await expect(page.getByText(/error/i)).toBeVisible()
  })

  test('should maintain state during navigation', async ({ page }) => {
    await page.goto('/tool')
    
    // Mock successful data load
    await page.route('**/api/following**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          following: [
            {
              fid: 1,
              username: 'user1',
              displayName: 'User One',
              pfp: { url: 'avatar1.jpg' },
              followerCount: 100,
              followingCount: 50,
            }
          ],
          totalPages: 1,
          totalFollowing: 1,
        })
      })
    })

    // Wait for data to load
    await expect(page.getByText('User One')).toBeVisible()
    
    // Navigate away and back
    await page.goto('/')
    await page.goto('/tool')
    
    // Should still show data (or reload appropriately)
    await expect(page.getByText(/following/i)).toBeVisible()
  })
}) 