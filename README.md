# Chorus+ Backend

This project is the backbone of Chorus+ (Chorus Plus).

## Why?

Nothing annoys me more than doing 4 manual steps that could be automated (finding a song on [Chorus](https://chorus.fightthe.pw/), downloading it from Google Drive, unpacking it, moving the files into the Clone Hero songs directory). That's why I created Chorus+, which in theory should reduce the amount of steps to just one - finding the song (and pressing the *Download* button of course, but that doesn't count).

## How does it work?

Once you set up the Docker container (read below [will update later]), you should have an HTTP server with two routes:

- `/download/:songMD5`
- `/panel`

The former downloads a ZIP file containing all the data corresponding to the `songMD5` hash you'll find on [Chorus](https://chorus.fightthe.pw/), right above the instrument icons (since you're here I assume you know what an MD5 hash is). My main goal was to make it as simple as possible for the end-user, so it doesn't matter whether the song was uploaded to Google Drive as a folder, ZIP file, RAR or any other kind of archive (as long as 7-Zip can extract it!).

Assuming I've done my system security homework right, only the admin should have access to the the latter route. It's a simple panel allowing the admin to monitor what's going on inside the system. There is no hard-coded password for the users, rather a password is generated at start-up.

> *Best passwords are the ones even you don't know.*
>
> ~ me, just now