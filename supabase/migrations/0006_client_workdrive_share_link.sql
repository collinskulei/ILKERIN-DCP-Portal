-- workdrive_folder_url is the internal link the case manager uses to open the
-- folder themselves (an existing manually-linked folder, or the permalink of
-- an auto-created one). workdrive_share_link is the upload-permission
-- external link generated for auto-created folders, meant to be copied and
-- sent to the client. Manually-linked historical clients may have no share
-- link on record if it was already sent outside this app.
alter table clients add column workdrive_share_link text;
