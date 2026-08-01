import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { query } from './db';
import { logAction } from './audit';
import { isLoginRateLimited } from './rate-limit';

if (!process.env.ADMIN_SUPERADMIN_PASS || !process.env.ADMIN1_PASS || !process.env.ADMIN2_PASS) {
  console.warn(
    '[auth] WARNING: Missing ADMIN_SUPERADMIN_PASS, ADMIN1_PASS, or ADMIN2_PASS in .env.local. ' +
    'Admin login will not work until these are set.'
  );
}

const ADMINS: Record<string, { name: string; password: string | undefined; role: string }> = {
  'superadmin': { name:'Principal',       password: process.env.ADMIN_SUPERADMIN_PASS, role:'superadmin' },
  'admin1':     { name:'Administrator 1', password: process.env.ADMIN1_PASS,           role:'admin' },
  'admin2':     { name:'Administrator 2', password: process.env.ADMIN2_PASS,           role:'admin' },
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label:'Username/Email', type:'text' },
        password: { label:'Password', type:'password' },
        userType: { label:'User Type', type:'text' },
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password || !credentials?.userType) return null;

        const ip = (req?.headers as any)?.['x-forwarded-for']?.split(',')[0]?.trim()
          || (req?.headers as any)?.['x-real-ip']
          || 'unknown';
        const limitKey = `${ip}:${credentials.username.toLowerCase()}`;
        if (isLoginRateLimited(limitKey)) {
          console.warn(`[auth] Rate limited login attempt for ${limitKey}`);
          return null;
        }

        try {
          if (credentials.userType === 'admin') {
            const key = credentials.username.toLowerCase().trim();
            const adminDef = ADMINS[key];

            // ── 1. Try real admin accounts first ──
            if (adminDef && credentials.password === adminDef.password) {
              await logAction({ adminId:0, adminName:adminDef.name, actionType:'LOGIN', module:'AUTH', details:`Admin ${key} logged in` });
              return {
                id:key, name:adminDef.name, email:`${key}@sv8cnhs.edu.ph`,
                role:adminDef.role, adminId:key, userType:'admin', isAdviser:false,
              };
            }

            // ── 2. Not a real admin — try matching an adviser account.
            // Username = adviser name (uppercased), password = section name
            // (uppercased). Logs in through the SAME "Admin" form/option,
            // but carries isAdviser:true so access stays scoped to their
            // own section — see middleware.ts and the students API routes. ──
            const advUsername = credentials.username.trim().toUpperCase();
            const rows = await query<any[]>(
              'SELECT id, grade_level, name, class_adviser, username, password_hash FROM sections WHERE username=?',
              [advUsername]
            );
            if (rows.length && rows[0].password_hash && await bcrypt.compare(credentials.password, rows[0].password_hash)) {
              const sec = rows[0];
              await logAction({
                adminId: 0, adminName: sec.class_adviser, actionType: 'LOGIN', module: 'AUTH',
                details: `Adviser ${sec.class_adviser} logged in (Section ${sec.name}, Grade ${sec.grade_level})`,
              });
              return {
                id: `section-${sec.id}`,
                name: sec.class_adviser,
                email: `${sec.username}@sv8cnhs.edu.ph`,
                role: 'adviser',
                userType: 'admin',     // intentionally 'admin' so the existing dashboard layout allows them in
                isAdviser: true,
                sectionId: sec.id,
                gradeLevel: sec.grade_level,
                sectionName: sec.name,
              };
            }

            return null;
          }

          if (credentials.userType === 'faculty') {
            const email = credentials.username.toLowerCase().trim();
            const rows = await query<any[]>('SELECT id,email,first_name,last_name,password_hash FROM faculty WHERE email=?',[email]);
            if (!rows.length || !rows[0].password_hash) return null;
            if (!await bcrypt.compare(credentials.password, rows[0].password_hash)) return null;
            const f = rows[0];
            return { id:f.id.toString(), name:`${f.first_name} ${f.last_name}`.trim()||f.email, email:f.email, role:'faculty', userType:'faculty', personId:f.id.toString() };
          }

          if (credentials.userType === 'staff') {
            const email = credentials.username.toLowerCase().trim();
            const rows = await query<any[]>('SELECT id,email,first_name,last_name,password_hash FROM staff WHERE email=?',[email]);
            if (!rows.length || !rows[0].password_hash) return null;
            if (!await bcrypt.compare(credentials.password, rows[0].password_hash)) return null;
            const s = rows[0];
            return { id:s.id.toString(), name:`${s.first_name} ${s.last_name}`.trim()||s.email, email:s.email, role:'staff', userType:'staff', personId:s.id.toString() };
          }

          if (credentials.userType === 'student') {
            const email = credentials.username.toLowerCase().trim();
            const rows = await query<any[]>('SELECT id,email,first_name,last_name,password_hash FROM students WHERE email=?',[email]);
            if (!rows.length || !rows[0].password_hash) return null;
            if (!await bcrypt.compare(credentials.password, rows[0].password_hash)) return null;
            const s = rows[0];
            return { id:s.id.toString(), name:`${s.first_name} ${s.last_name}`.trim()||s.email, email:s.email, role:'student', userType:'student', personId:s.id.toString() };
          }

          return null;
        } catch (e) {
          console.error('Auth error:', e);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.adminId = (user as any).adminId;
        token.userType = (user as any).userType;
        token.personId = (user as any).personId;
        token.isAdviser = (user as any).isAdviser || false;
        token.sectionId = (user as any).sectionId;
        token.gradeLevel = (user as any).gradeLevel;
        token.sectionName = (user as any).sectionName;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).adminId = token.adminId;
        (session.user as any).userType = token.userType;
        (session.user as any).personId = token.personId;
        (session.user as any).isAdviser = token.isAdviser || false;
        (session.user as any).sectionId = token.sectionId;
        (session.user as any).gradeLevel = token.gradeLevel;
        (session.user as any).sectionName = token.sectionName;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
  session: { strategy:'jwt', maxAge: 8 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
};