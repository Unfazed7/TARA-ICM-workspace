# Key and Certificate Portal: Answers to Intake Questions

Date: 2026-09-15
Prepared by: platform team

Synthetic document for testing. It describes no real system.

---

**1. What does the system do, and who runs it?**

The portal lets our operators and internal services request and download X.509 certificates, and lets security admins approve and revoke them. It runs in a dedicated cloud account, which our platform team runs.

**2. Which environment do these answers describe?**

These answers describe `kcp-dev`. We are onboarding the dev environment first. Production will follow the same design later.

**3. How is the portal reached from the internet?**

The API gateway is the only public entry point. Everything else is only reachable from inside the network.

**4. Do you use a web application firewall?**

We do not use a WAF at the moment.

**5. How do people sign in?**

Operators and security admins sign in with the corporate SSO. It is run by central IT and is also used by other company applications. A token authorizer on the API gateway checks the SSO token on every request.

**6. Where are the signing keys kept?**

The CA signing key is held in the cloud key management service. Its key policy lets only the key service role use the key for signing, and only the security-admin role change the policy or schedule the key for deletion.

**7. Where are passwords and API keys kept?**

The database password and the notification service API key are kept in the secrets store. The services read them at start-up.

**8. How are notifications sent?**

Expiry reminders are emailed through an external notification service. We call its HTTPS API with an API key.

**9. How is the portal deployed?**

Our CI/CD pipeline runs in a hosted CI service the company subscribes to. It builds container images, pushes them to the container registry and deploys them to the cluster using a deploy role.

**10. What is logged?**

API calls in the cloud account are recorded by the audit trail. Application logs and metrics go to the cloud logging service.

**11. What data does the portal store?**

Certificate requests and issued certificate records are stored in a managed PostgreSQL database.

**12. What does the portal cost to run each month?**

About 1,400 in cloud charges, most of it for the database and the cluster.
