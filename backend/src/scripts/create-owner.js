import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

/**
 * Prompt the user for a password without echoing input.
 * Returns a Promise that resolves to the entered password string.
 */
function askHidden(question) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(question);
    stdin.resume();
    stdin.setRawMode(true);
    let password = '';
    const onData = (char) => {
      char = char.toString();
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdout.write('\n');
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        resolve(password);
      } else if (char === '\u0003') {
        // Ctrl+C
        process.exit();
      } else if (char === '\u007f') {
        // Backspace
        if (password.length > 0) password = password.slice(0, -1);
      } else {
        password += char;
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI not defined in .env');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('🔗 Connected to MongoDB');

    const email = 'zaidquazi412@gmail.com';
    const username = 'zaid';

    // Check for existing owner
    const existingOwner = await User.findOne({ role: 'owner' });
    if (existingOwner) {
      console.error('❌ An owner account already exists (email:', existingOwner.email, ')');
      process.exit(1);
    }

    // Check for duplicate email or username
    const duplicate = await User.findOne({
      $or: [{ email }, { usernameLowerCase: username.toLowerCase() }],
    });
    if (duplicate) {
      console.error('❌ A user with the same email or username already exists.');
      process.exit(1);
    }

    const password = await askHidden('Enter password for the owner account (input hidden): ');
    if (!password || password.length < 6) {
      console.error('❌ Password must be at least 6 characters long.');
      process.exit(1);
    }

    const owner = new User({
      email,
      username,
      password,
      role: 'owner',
      isVerified: true, // Assuming email verification is not enforced
      isOnboarded: true,
    });

    await owner.save();
    console.log('✅ Owner account created successfully.');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

main();
