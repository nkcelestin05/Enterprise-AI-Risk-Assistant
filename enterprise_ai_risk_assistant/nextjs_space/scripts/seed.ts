import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed admin user
  const adminPassword = await bcrypt.hash('johndoe123', 12);
  await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: { role: 'admin' },
    create: {
      email: 'john@doe.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'admin',
    },
  });
  console.log('Admin user seeded.');

  // Seed policy documents
  const policies = [
    {
      title: 'Credit Score Requirements',
      section: 'credit_score',
      content: 'Applicants with a credit score below 600 are classified as HIGH RISK. Scores between 600-700 are MEDIUM RISK. Scores above 700 are LOW RISK and eligible for expedited processing.',
    },
    {
      title: 'Debt-to-Income Limits',
      section: 'dti',
      content: 'Maximum acceptable DTI ratio is 0.45 (45%). DTI above 0.50 (50%) results in automatic decline unless exceptional circumstances apply.',
    },
    {
      title: 'Employment History Requirements',
      section: 'employment',
      content: 'Minimum 2 years of continuous employment required. Self-employed applicants need 3 years of tax returns. Recent job changes acceptable if in same field with no income reduction.',
    },
    {
      title: 'Loan Amount Guidelines',
      section: 'loan_amount',
      content: 'Personal loans: $5,000-$50,000. Unsecured loans up to $25,000. Loans above $25,000 may require collateral. Minimum credit score of 580 for all products.',
    },
    {
      title: 'Risk Assessment Process',
      section: 'risk_process',
      content: 'Step 1: Automated credit and fraud screening. Step 2: ML-based risk scoring. Step 3: Decision routing (Low <40%: Auto-approve, Medium 40-70%: Underwriter review, High >70%: Senior review).',
    },
  ];

  for (const policy of policies) {
    await prisma.policyDocument.upsert({
      where: { id: policy.section },
      update: { title: policy.title, content: policy.content, section: policy.section },
      create: { id: policy.section, title: policy.title, content: policy.content, section: policy.section },
    });
  }
  console.log('Policy documents seeded.');

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
