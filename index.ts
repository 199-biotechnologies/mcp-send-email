#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Resend } from "resend";
import minimist from "minimist";

// Parse command line arguments
const argv = minimist(process.argv.slice(2));

// Get API key from command line argument or fall back to environment variable
const apiKey = argv.key || process.env.RESEND_API_KEY;

// Get sender email address from command line argument or fall back to environment variable
// Optional.
const senderEmailAddress = argv.sender || process.env.SENDER_EMAIL_ADDRESS;

// Get reply to email addresses from command line argument or fall back to environment variable
let replierEmailAddresses: string[] = [];

if (Array.isArray(argv["reply-to"])) {
  replierEmailAddresses = argv["reply-to"];
} else if (typeof argv["reply-to"] === "string") {
  replierEmailAddresses = [argv["reply-to"]];
} else if (process.env.REPLY_TO_EMAIL_ADDRESSES) {
  replierEmailAddresses = process.env.REPLY_TO_EMAIL_ADDRESSES.split(",");
}

if (!apiKey) {
  console.error(
    "No API key provided. Please set RESEND_API_KEY environment variable or use --key argument"
  );
  process.exit(1);
}

const resend = new Resend(apiKey);

// Create server instance
const server = new McpServer({
  name: "resend-mcp",
  version: "2.0.0",
  description: "Complete MCP server for Resend API with all endpoints",
});

// Email sending tool (existing functionality)
server.tool(
  "send-email",
  "Send an email using Resend",
  {
    to: z.union([z.string().email(), z.array(z.string().email())]).describe("Recipient email address(es)"),
    subject: z.string().describe("Email subject line"),
    text: z.string().describe("Plain text email content"),
    html: z
      .string()
      .optional()
      .describe(
        "HTML email content. When provided, the plain text argument MUST be provided as well."
      ),
    cc: z
      .union([z.string().email(), z.array(z.string().email())])
      .optional()
      .describe("Optional CC email address(es). You MUST ask the user for this parameter. Under no circumstance provide it yourself"),
    bcc: z
      .union([z.string().email(), z.array(z.string().email())])
      .optional()
      .describe("Optional BCC email address(es). You MUST ask the user for this parameter. Under no circumstance provide it yourself"),
    scheduledAt: z
      .string()
      .optional()
      .describe(
        "Optional parameter to schedule the email. This uses natural language. Examples would be 'tomorrow at 10am' or 'in 2 hours' or 'next day at 9am PST' or 'Friday at 3pm ET'."
      ),
    tags: z
      .array(z.object({
        name: z.string(),
        value: z.string()
      }))
      .optional()
      .describe("Optional array of tags for the email"),
    attachments: z
      .array(z.object({
        filename: z.string(),
        content: z.string().describe("Base64 encoded file content"),
        path: z.string().optional()
      }))
      .optional()
      .describe("Optional array of file attachments"),
    headers: z
      .record(z.string())
      .optional()
      .describe("Optional custom headers for the email"),
    // If sender email address is not provided, the tool requires it as an argument
    ...(!senderEmailAddress
      ? {
          from: z
            .string()
            .email()
            .nonempty()
            .describe(
              "Sender email address. You MUST ask the user for this parameter. Under no circumstance provide it yourself"
            ),
        }
      : {}),
    ...(replierEmailAddresses.length === 0
      ? {
          replyTo: z
            .union([z.string().email(), z.array(z.string().email())])
            .optional()
            .describe(
              "Optional email address(es) for the email readers to reply to. You MUST ask the user for this parameter. Under no circumstance provide it yourself"
            ),
        }
      : {}),
  },
  async ({ from, to, subject, text, html, replyTo, scheduledAt, cc, bcc, tags, attachments, headers }) => {
    const fromEmailAddress = from ?? senderEmailAddress;
    const replyToEmailAddresses = replyTo ?? replierEmailAddresses;

    // Type check on from, since "from" is optionally included in the arguments schema
    // This should never happen.
    if (typeof fromEmailAddress !== "string") {
      throw new Error("from argument must be provided.");
    }

    console.error(`Debug - Sending email with from: ${fromEmailAddress}`);
    
    // Explicitly structure the request with all parameters to ensure they're passed correctly
    const emailRequest: any = {
      to,
      subject,
      text,
      from: fromEmailAddress,
    };
    
    // Add optional parameters conditionally
    if (replyToEmailAddresses && (typeof replyToEmailAddresses === "string" || (Array.isArray(replyToEmailAddresses) && replyToEmailAddresses.length > 0))) {
      emailRequest.replyTo = replyToEmailAddresses;
    }
    
    if (html) {
      emailRequest.html = html;
    }
    
    if (scheduledAt) {
      emailRequest.scheduledAt = scheduledAt;
    }
    
    if (cc) {
      emailRequest.cc = cc;
    }
    
    if (bcc) {
      emailRequest.bcc = bcc;
    }
    
    if (tags) {
      emailRequest.tags = tags;
    }
    
    if (attachments) {
      emailRequest.attachments = attachments;
    }
    
    if (headers) {
      emailRequest.headers = headers;
    }
    
    console.error(`Email request: ${JSON.stringify(emailRequest)}`);

    const response = await resend.emails.send(emailRequest);

    if (response.error) {
      throw new Error(
        `Email failed to send: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Email sent successfully! ID: ${response.data?.id}`,
        },
      ],
    };
  }
);

// Batch email sending tool
server.tool(
  "send-batch-emails",
  "Send multiple emails in a single batch (up to 100 emails)",
  {
    emails: z.array(z.object({
      to: z.union([z.string().email(), z.array(z.string().email())]).describe("Recipient email address(es)"),
      subject: z.string().describe("Email subject line"),
      text: z.string().describe("Plain text email content"),
      from: z.string().email().optional().describe("Sender email address (uses default if not provided)"),
      html: z.string().optional().describe("HTML email content"),
      cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
      bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
      replyTo: z.union([z.string().email(), z.array(z.string().email())]).optional(),
      scheduledAt: z.string().optional(),
      tags: z.array(z.object({
        name: z.string(),
        value: z.string()
      })).optional(),
      attachments: z.array(z.object({
        filename: z.string(),
        content: z.string()
      })).optional(),
      headers: z.record(z.string()).optional()
    })).max(100).describe("Array of emails to send (maximum 100)")
  },
  async ({ emails }) => {
    // Add default from address if not provided
    const batchEmails = emails.map(email => ({
      ...email,
      from: email.from || senderEmailAddress
    }));

    const response = await resend.batch.send(batchEmails);

    if (response.error) {
      throw new Error(
        `Batch email failed to send: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Batch emails sent successfully! IDs: ${response.data?.data.map(e => e.id).join(', ')}`,
        },
      ],
    };
  }
);

// Get email tool
server.tool(
  "get-email",
  "Retrieve information about a specific email",
  {
    emailId: z.string().describe("The ID of the email to retrieve")
  },
  async ({ emailId }) => {
    const response = await resend.emails.get(emailId);

    if (response.error) {
      throw new Error(
        `Failed to get email: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }
);

// Update email tool
server.tool(
  "update-email",
  "Update properties of an email (e.g., scheduled time)",
  {
    emailId: z.string().describe("The ID of the email to update"),
    scheduledAt: z.string().describe("New scheduled time for the email")
  },
  async ({ emailId, scheduledAt }) => {
    const response = await resend.emails.update({
      id: emailId,
      scheduledAt
    });

    if (response.error) {
      throw new Error(
        `Failed to update email: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Email updated successfully! ID: ${response.data?.id}`,
        },
      ],
    };
  }
);

// Cancel scheduled email tool
server.tool(
  "cancel-email",
  "Cancel a scheduled email",
  {
    emailId: z.string().describe("The ID of the email to cancel")
  },
  async ({ emailId }) => {
    const response = await resend.emails.cancel(emailId);

    if (response.error) {
      throw new Error(
        `Failed to cancel email: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Email cancelled successfully! ID: ${response.data?.id}`,
        },
      ],
    };
  }
);

// Domain management tools
server.tool(
  "create-domain",
  "Add a new sending domain to Resend",
  {
    name: z.string().describe("The domain name to add (e.g., example.com)"),
    region: z.enum(["us-east-1", "eu-west-1", "sa-east-1"]).optional().describe("AWS region for the domain")
  },
  async ({ name, region }) => {
    const response = await resend.domains.create({ name, region });

    if (response.error) {
      throw new Error(
        `Failed to create domain: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Domain created successfully! ID: ${response.data?.id}\n\nDNS Records to configure:\n${JSON.stringify(response.data?.records, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  "list-domains",
  "List all domains in your Resend account",
  {},
  async () => {
    const response = await resend.domains.list();

    if (response.error) {
      throw new Error(
        `Failed to list domains: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data?.data, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get-domain",
  "Get details of a specific domain",
  {
    domainId: z.string().describe("The ID of the domain to retrieve")
  },
  async ({ domainId }) => {
    const response = await resend.domains.get(domainId);

    if (response.error) {
      throw new Error(
        `Failed to get domain: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "update-domain",
  "Update domain settings (tracking, TLS)",
  {
    domainId: z.string().describe("The ID of the domain to update"),
    openTracking: z.boolean().optional().describe("Enable/disable open tracking"),
    clickTracking: z.boolean().optional().describe("Enable/disable click tracking"),
    tls: z.enum(["enforced", "opportunistic"]).optional().describe("TLS policy")
  },
  async ({ domainId, openTracking, clickTracking, tls }) => {
    const updateData: any = {
      id: domainId
    };
    if (openTracking !== undefined) updateData.openTracking = openTracking;
    if (clickTracking !== undefined) updateData.clickTracking = clickTracking;
    if (tls !== undefined) updateData.tls = tls;

    const response = await resend.domains.update(updateData);

    if (response.error) {
      throw new Error(
        `Failed to update domain: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Domain updated successfully! ID: ${response.data?.id}`,
        },
      ],
    };
  }
);

server.tool(
  "delete-domain",
  "Remove a domain from your Resend account",
  {
    domainId: z.string().describe("The ID of the domain to delete")
  },
  async ({ domainId }) => {
    const response = await resend.domains.remove(domainId);

    if (response.error) {
      throw new Error(
        `Failed to delete domain: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Domain deleted successfully! ID: ${response.data?.id}`,
        },
      ],
    };
  }
);

server.tool(
  "verify-domain",
  "Trigger domain verification",
  {
    domainId: z.string().describe("The ID of the domain to verify")
  },
  async ({ domainId }) => {
    const response = await resend.domains.verify(domainId);

    if (response.error) {
      throw new Error(
        `Failed to verify domain: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Domain verification triggered! ID: ${response.data?.id}`,
        },
      ],
    };
  }
);

// API Key management tools
server.tool(
  "create-api-key",
  "Create a new API key",
  {
    name: z.string().describe("Name for the API key"),
    permission: z.enum(["full_access", "sending_access"]).optional().describe("Permission level for the key"),
    domainId: z.string().optional().describe("Optional domain ID to restrict the key to")
  },
  async ({ name, permission, domainId }) => {
    const response = await resend.apiKeys.create({ 
      name, 
      permission: permission || "sending_access",
      domain_id: domainId 
    });

    if (response.error) {
      throw new Error(
        `Failed to create API key: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `API key created successfully! ID: ${response.data?.id}\nToken: ${response.data?.token}\n\nIMPORTANT: Save this token securely, it won't be shown again!`,
        },
      ],
    };
  }
);

server.tool(
  "list-api-keys",
  "List all API keys in your account",
  {},
  async () => {
    const response = await resend.apiKeys.list();

    if (response.error) {
      throw new Error(
        `Failed to list API keys: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "delete-api-key",
  "Delete an API key",
  {
    apiKeyId: z.string().describe("The ID of the API key to delete")
  },
  async ({ apiKeyId }) => {
    const response = await resend.apiKeys.remove(apiKeyId);

    if (response.error) {
      throw new Error(
        `Failed to delete API key: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: "API key deleted successfully!",
        },
      ],
    };
  }
);

// Audience management tools
server.tool(
  "create-audience",
  "Create a new audience (contact list)",
  {
    name: z.string().describe("Name for the audience")
  },
  async ({ name }) => {
    const response = await resend.audiences.create({ name });

    if (response.error) {
      throw new Error(
        `Failed to create audience: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Audience created successfully! ID: ${response.data?.id}`,
        },
      ],
    };
  }
);

server.tool(
  "list-audiences",
  "List all audiences in your account",
  {},
  async () => {
    const response = await resend.audiences.list();

    if (response.error) {
      throw new Error(
        `Failed to list audiences: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data?.data, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get-audience",
  "Get details of a specific audience",
  {
    audienceId: z.string().describe("The ID of the audience to retrieve")
  },
  async ({ audienceId }) => {
    const response = await resend.audiences.get(audienceId);

    if (response.error) {
      throw new Error(
        `Failed to get audience: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "delete-audience",
  "Delete an audience",
  {
    audienceId: z.string().describe("The ID of the audience to delete")
  },
  async ({ audienceId }) => {
    const response = await resend.audiences.remove(audienceId);

    if (response.error) {
      throw new Error(
        `Failed to delete audience: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Audience deleted successfully! ID: ${response.data?.id}`,
        },
      ],
    };
  }
);

// Contact management tools
server.tool(
  "create-contact",
  "Add a contact to an audience",
  {
    audienceId: z.string().describe("The ID of the audience"),
    email: z.string().email().describe("Contact email address"),
    firstName: z.string().optional().describe("Contact first name"),
    lastName: z.string().optional().describe("Contact last name"),
    unsubscribed: z.boolean().optional().describe("Whether the contact is unsubscribed")
  },
  async ({ audienceId, email, firstName, lastName, unsubscribed }) => {
    const response = await resend.contacts.create({
      audienceId,
      email,
      firstName,
      lastName,
      unsubscribed
    });

    if (response.error) {
      throw new Error(
        `Failed to create contact: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Contact created successfully! ID: ${response.data?.id}`,
        },
      ],
    };
  }
);

server.tool(
  "list-contacts",
  "List all contacts in an audience",
  {
    audienceId: z.string().describe("The ID of the audience")
  },
  async ({ audienceId }) => {
    const response = await resend.contacts.list({ audienceId });

    if (response.error) {
      throw new Error(
        `Failed to list contacts: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data?.data, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get-contact",
  "Get details of a specific contact",
  {
    audienceId: z.string().describe("The ID of the audience"),
    contactId: z.string().describe("The ID of the contact")
  },
  async ({ audienceId, contactId }) => {
    const response = await resend.contacts.get({ 
      audienceId,
      id: contactId 
    });

    if (response.error) {
      throw new Error(
        `Failed to get contact: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "update-contact",
  "Update contact information",
  {
    audienceId: z.string().describe("The ID of the audience"),
    contactId: z.string().describe("The ID of the contact"),
    firstName: z.string().optional().describe("New first name"),
    lastName: z.string().optional().describe("New last name"),
    unsubscribed: z.boolean().optional().describe("Update subscription status")
  },
  async ({ audienceId, contactId, firstName, lastName, unsubscribed }) => {
    const updateData: any = {};
    if (firstName !== undefined) updateData.first_name = firstName;
    if (lastName !== undefined) updateData.last_name = lastName;
    if (unsubscribed !== undefined) updateData.unsubscribed = unsubscribed;

    const response = await resend.contacts.update({
      audienceId,
      id: contactId,
      ...updateData
    });

    if (response.error) {
      throw new Error(
        `Failed to update contact: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Contact updated successfully! ID: ${response.data?.id}`,
        },
      ],
    };
  }
);

server.tool(
  "delete-contact",
  "Delete a contact by ID or email",
  {
    audienceId: z.string().describe("The ID of the audience"),
    contactId: z.string().optional().describe("The ID of the contact (use either this or email)"),
    email: z.string().email().optional().describe("The email of the contact (use either this or contactId)")
  },
  async ({ audienceId, contactId, email }) => {
    if (!contactId && !email) {
      throw new Error("Either contactId or email must be provided");
    }

    const response = await resend.contacts.remove({
      audienceId,
      id: contactId,
      email
    } as any);

    if (response.error) {
      throw new Error(
        `Failed to delete contact: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Contact deleted successfully!`,
        },
      ],
    };
  }
);

// Broadcast management tools
server.tool(
  "create-broadcast",
  "Create an email broadcast for an audience",
  {
    name: z.string().describe("Name of the broadcast"),
    audienceId: z.string().describe("ID of the audience to send to"),
    from: z.string().email().describe("Sender email address"),
    subject: z.string().describe("Email subject line"),
    replyTo: z.union([z.string().email(), z.array(z.string().email())]).optional().describe("Reply-to address(es)"),
    previewText: z.string().optional().describe("Preview text for the email"),
    text: z.string().optional().describe("Plain text content"),
    html: z.string().optional().describe("HTML content")
  },
  async ({ name, audienceId, from, subject, replyTo, previewText, text, html }) => {
    if (!text && !html) {
      throw new Error("Either text or html content must be provided");
    }

    const response = await resend.broadcasts.create({
      name,
      audienceId,
      from,
      subject,
      replyTo,
      previewText,
      text,
      html
    } as any);

    if (response.error) {
      throw new Error(
        `Failed to create broadcast: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Broadcast created successfully! ID: ${response.data?.id}`,
        },
      ],
    };
  }
);

server.tool(
  "list-broadcasts",
  "List all broadcasts",
  {},
  async () => {
    const response = await resend.broadcasts.list();

    if (response.error) {
      throw new Error(
        `Failed to list broadcasts: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data?.data, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get-broadcast",
  "Get details of a specific broadcast",
  {
    broadcastId: z.string().describe("The ID of the broadcast")
  },
  async ({ broadcastId }) => {
    const response = await resend.broadcasts.get(broadcastId);

    if (response.error) {
      throw new Error(
        `Failed to get broadcast: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "send-broadcast",
  "Send a broadcast immediately or schedule it",
  {
    broadcastId: z.string().describe("The ID of the broadcast to send"),
    scheduledAt: z.string().optional().describe("Optional scheduled time for the broadcast")
  },
  async ({ broadcastId, scheduledAt }) => {
    const response = await resend.broadcasts.send(
      broadcastId,
      scheduledAt ? { scheduledAt } : undefined
    );

    if (response.error) {
      throw new Error(
        `Failed to send broadcast: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Broadcast sent successfully! ID: ${response.data?.id}`,
        },
      ],
    };
  }
);

server.tool(
  "delete-broadcast",
  "Delete a draft broadcast",
  {
    broadcastId: z.string().describe("The ID of the broadcast to delete")
  },
  async ({ broadcastId }) => {
    const response = await resend.broadcasts.remove(broadcastId);

    if (response.error) {
      throw new Error(
        `Failed to delete broadcast: ${JSON.stringify(response.error)}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Broadcast deleted successfully! ID: ${response.data?.id}`,
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Resend MCP Server running on stdio - All API endpoints available!");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});