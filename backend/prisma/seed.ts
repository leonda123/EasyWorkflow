import { PrismaClient, UserRole, MemberRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function encryptPassword(password: string, encryptionKey: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

async function main() {
  const adminEmail = 'admin@easyworkflow.com';
  const adminPassword = 'admin123';
  const adminName = 'Admin';
  const encryptionKey = process.env.ENCRYPTION_KEY || 'ew_encryption_key_32chars_prod_2024';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('Super admin already exists:', adminEmail);
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(adminPassword, salt);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: passwordHash,
      name: adminName,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log('Super admin created successfully:');
  console.log('  Email:', admin.email);
  console.log('  Name:', admin.name);
  console.log('  Role:', admin.role);

  const team = await prisma.team.create({
    data: {
      name: "Admin's Team",
      slug: 'admin-team',
      ownerId: admin.id,
    },
  });

  await prisma.teamMember.create({
    data: {
      userId: admin.id,
      teamId: team.id,
      role: MemberRole.OWNER,
    },
  });

  console.log('Default team created:');
  console.log('  Team ID:', team.id);
  console.log('  Team Name:', team.name);

  const existingMqConfig = await prisma.mqConfig.findFirst();
  if (!existingMqConfig) {
    await prisma.mqConfig.create({
      data: {
        host: 'rabbitmq',
        port: 5672,
        username: 'easyworkflow',
        password: encryptPassword('easyworkflow123', encryptionKey),
        vhost: '/',
        enabled: true,
        connected: false,
        maxRetries: 3,
        retryDelay: 5000,
        prefetchCount: 10,
        messageTtl: 86400000,
      },
    });
    console.log('MQ config created');
  } else {
    await prisma.mqConfig.update({
      where: { id: existingMqConfig.id },
      data: {
        host: 'rabbitmq',
        port: 5672,
        username: 'easyworkflow',
        password: encryptPassword('easyworkflow123', encryptionKey),
      },
    });
    console.log('MQ config updated');
  }

  const existingSystemSettings = await prisma.systemSettings.findUnique({
    where: { id: 'system' },
  });
  if (!existingSystemSettings) {
    await prisma.systemSettings.create({
      data: {
        id: 'system',
        easyBotEnabled: true,
        processNodeAiEnabled: true,
      },
    });
    console.log('System settings created');
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
