import jwt from "jsonwebtoken"//this file is to improve security

const jwtToken=(userId,res)=>{
    const token=jwt.sign({userId},process.env.JWT_SECRET,{
        expiresIn:"30d"//cookie of user registration will expire in 30 d
    })
res.cookie('jwt',token,{
    maxAge:30 *24 *60 *60 *1000,//approx 1 year
    httpOnly:true,//more secure
    sameSite:"strict",
    secure:process.env.SECURE !=="devlopment"//jb deploy process m to secure nhi but jb deploy tbse secure
})
}
export default jwtToken