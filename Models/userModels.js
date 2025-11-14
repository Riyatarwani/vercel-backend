// userModels.js
import mongoose from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        validate: {
            validator: function(v) {
                return /^[a-zA-Z0-9_]+$/.test(v);
            },
            message: 'Username can only contain letters, numbers and underscores'
        }
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: validator.isEmail,
            message: 'Please provide a valid email'
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false // Don't include password in query results by default
    },
    gender: {
        type: String,
        enum: {
            values: ['male', 'female', 'other'],
            message: '{VALUE} is not a valid gender option'
        },
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active' // Changed from 'pending' since we removed email verification
    },
    education: {
        institute: {
            type: String,
            trim: true
        },
        degree: {
            type: String,
            trim: true
        },
        field: {
            type: String,
            trim: true
        },
        year: {
            type: String,
            validate: {
                validator: function(v) {
                    return !v || /^\d{4}$/.test(v);
                },
                message: 'Year should be a 4-digit number'
            }
        }
    },
  skills: [{
    type: String,
    trim: true,
    required: [true, 'Please provide at least one skill']
}],
location: {
    type: String,
    trim: true,
    required: [true, 'Location is required']
},
phoneNumber: {
    type: String,
    trim: true,
    required: [true, 'Phone number is required'],
    validate: {
        validator: function(v) {
            return /^\+?[0-9]{10,15}$/.test(v); // No empty allowed now
        },
        message: 'Please provide a valid phone number'
    }
},

    avatar: {
        type: String,
        default: 'default-avatar.png'
    },
    bio: {
        type: String,
        maxlength: [200, 'Bio cannot exceed 200 characters']
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    lastLogin: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Find user with password included
userSchema.statics.findByCredentials = async function(email, password) {
    // Find user by email and explicitly include password field
    const user = await this.findOne({ email }).select('+password');
    
    if (!user) {
        return null;
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
        return null;
    }
    
    return user;
};

// Method to check if password matches
userSchema.methods.isPasswordMatch = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;