# Supabase Configuration Checklist

Please verify these settings in your Supabase dashboard:

## 1. Authentication → URL Configuration
Go to: https://supabase.com/dashboard/project/sdmbhuatiqyizwychnqk/auth/url-configuration

### Site URL
Set to: `http://localhost:3000`

### Redirect URLs
Add these URLs (one per line):
```
http://localhost:3000/**
http://localhost:3000/auth/callback
```

## 2. Authentication → Email Templates
Go to: https://supabase.com/dashboard/project/sdmbhuatiqyizwychnqk/auth/templates

### Magic Link Template
Make sure the redirect URL in the template uses:
```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email
```

Or the newer PKCE flow:
```
{{ .ConfirmationURL }}
```

## 3. Authentication → Providers
Go to: https://supabase.com/dashboard/project/sdmbhuatiqyizwychnqk/auth/providers

- [x] Email provider is **enabled**
- [x] Confirm email is **disabled** (for development)
- [x] Secure email change is **enabled**

## Common Issues

### Issue: "invalid flow state"
**Solution**: This happens when cookies aren't preserved. Try:
1. Clear browser cookies for localhost
2. Try in an incognito/private window
3. Make sure Site URL matches exactly (no trailing slash)
4. Ensure redirect URLs include `http://localhost:3000/**` with the wildcard

### Issue: Email link redirects to login
**Solution**: 
1. Check that redirect URLs are configured (see above)
2. Make sure you're clicking the link in the SAME browser where you requested it
3. Try copying the link and pasting it directly in the browser

## Test Steps

1. Go to http://localhost:3000
2. Enter your email
3. Check terminal for "Check your email" message
4. Open email in the SAME browser
5. Click the magic link
6. Should redirect to dashboard

