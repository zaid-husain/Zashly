import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

/**
 * Prompt for hidden input (password) without echoing.
 */
function askHidden(prompt) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(prompt);
    stdin.resume();
    stdin.setRawMode(true);
    let input = '';
    const onData = (char) => {
      char = char.toString();
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdout.write('\n');
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        resolve(input);
      } else if (char === '\u0003') {
        // Ctrl+C – abort
        process.exit(1);
      } else if (char === '\u007f') {
        // Backspace
        if (input.length) input = input.slice(0, -1);
      } else {
        input += char;
      }
    };
    stdin.on('data', onData);
  });
}

/** Simple password‑strength check: >=8 chars, at least one letter and one digit */
function isStrong(pwd) {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-./]{8,}$/.test(pwd);
}

async function main() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI missing in .env');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('🔗 Connected to MongoDB');

    const email = 'zaidquazi412@gmail.com';
    const owner = await User.findOne({ email }).select('+password');
    if (!owner) {
      console.error(`❌ No user found with email ${email}`);
      process.exit(1);
    }
    if (owner.role !== 'owner') {
      console.error('❌ Account found but does not have the owner role.');
      process.exit(1);
    }

    const pwd1 = await askHidden('Enter new password (hidden): ');
    if (!isStrong(pwd1)) {
      console.error('❌ Weak password – must be ≥8 chars, include letters & digits.');
      process.exit(1);
    }
    const pwd2 = await askHidden('Confirm new password (hidden): ');
    if (pwd1 !== pwd2) {
      console.error('❌ Passwords do not match.');
      process.exit(1);
    }

    owner.password = pwd1; // pre‑save hook will hash it
    await owner.save();
    console.log('✅ Owner password reset successfully.');
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

main();
