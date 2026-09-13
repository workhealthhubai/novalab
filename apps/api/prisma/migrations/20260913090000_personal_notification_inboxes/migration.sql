INSERT INTO "notifications" ("id", "tenantId", "recipientUserId", "sourceKey", "template", "title", "body", "payload", "readAt", "createdAt")
SELECT gen_random_uuid(), n."tenantId", u."id", 'legacy:' || n."id" || ':user:' || u."id", n."template", n."title", n."body", n."payload", NULL, n."createdAt"
FROM "notifications" n JOIN "users" u ON u."tenantId" = n."tenantId"
WHERE n."recipientUserId" IS NULL AND u."deletedAt" IS NULL AND u."status" = 'ACTIVE' AND u."companyId" IS NULL
AND NOT EXISTS (SELECT 1 FROM "user_roles" ur JOIN "roles" r ON r."id" = ur."roleId" WHERE ur."userId" = u."id" AND r."name" = 'company_representative')
AND EXISTS (SELECT 1 FROM "user_roles" ur JOIN "role_permissions" rp ON rp."roleId" = ur."roleId" JOIN "permissions" p ON p."id" = rp."permissionId" WHERE ur."userId" = u."id" AND p."key" = CASE WHEN n."template" = 'examination-due' THEN 'examinations.read' WHEN n."template" = 'password-reset-request' THEN 'users.update' ELSE 'system.manage' END)
ON CONFLICT ("sourceKey") DO NOTHING;
