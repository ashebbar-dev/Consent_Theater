export interface DeletionTemplate {
    subject: string;
    body: string;
}

/**
 * Generate a DPDPA (India) data deletion request.
 */
export function generateDPDPARequest(
    userName: string,
    userEmail: string,
    brokerName: string,
    dataTypes: string[]
): DeletionTemplate {
    return {
        subject: `Data Erasure Request Under DPDPA 2023 — ${userName}`,
        body: `To the Data Protection Officer,
${brokerName}

Dear Sir/Madam,

I am writing to exercise my right to erasure of personal data under Section 12 of the Digital Personal Data Protection Act, 2023 (DPDPA).

I request the complete deletion of all personal data that ${brokerName} has collected, processed, or stored about me. This includes, but is not limited to:

${dataTypes.map((d) => `• ${d}`).join('\n')}

My details for identification purposes:
• Full Name: ${userName}
• Email: ${userEmail}

As per Section 12(1) of the DPDPA, I request that you:
1. Erase all my personal data from your systems
2. Direct any data processors acting on your behalf to do the same
3. Confirm completion of this erasure within 30 days

Please acknowledge receipt of this request within 48 hours and complete the erasure within 30 days as mandated by law.

If you require additional information to verify my identity, please contact me at the email address provided above.

Thank you for your prompt attention to this matter.

Sincerely,
${userName}
${userEmail}
Date: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    };
}

/**
 * Generate a GDPR (EU) data deletion request.
 */
export function generateGDPRRequest(
    userName: string,
    userEmail: string,
    brokerName: string,
    dataTypes: string[]
): DeletionTemplate {
    return {
        subject: `Right to Erasure Request Under GDPR Article 17 — ${userName}`,
        body: `To the Data Protection Officer,
${brokerName}

Dear Sir/Madam,

I am writing to exercise my right to erasure ("right to be forgotten") under Article 17 of the General Data Protection Regulation (EU) 2016/679.

I request the complete deletion of all personal data that ${brokerName} holds about me. This includes:

${dataTypes.map((d) => `• ${d}`).join('\n')}

My details for identification:
• Full Name: ${userName}
• Email: ${userEmail}

Under GDPR Article 17, you are required to:
1. Erase all my personal data without undue delay
2. Inform any third parties to whom this data has been disclosed
3. Confirm completion within one month (Article 12(3))

If you believe an exemption under Article 17(3) applies, please provide a detailed justification.

Failure to comply within the statutory timeframe may result in a complaint to the relevant supervisory authority.

Sincerely,
${userName}
${userEmail}
Date: ${new Date().toISOString().split('T')[0]}`,
    };
}
