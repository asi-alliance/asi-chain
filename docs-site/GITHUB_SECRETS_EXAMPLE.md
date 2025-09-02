# GitHub Secrets Configuration - Cut & Paste Ready

## 🔐 Required Secrets for Auto-Deployment

Go to: **https://github.com/asi-alliance/asi-chain/settings/secrets/actions**

Add these **3 secrets** with the exact values below:

---

## Secret #1: DEPLOY_HOST

**Name:** (Copy this exactly)
```
DEPLOY_HOST
```

**Secret value:** (Copy this exactly)
```
13.251.66.61
```

---

## Secret #2: DEPLOY_USER  

**Name:** (Copy this exactly)
```
DEPLOY_USER
```

**Secret value:** (Copy this exactly)
```
ubuntu
```

---

## Secret #3: DEPLOY_KEY

**Name:** (Copy this exactly)
```
DEPLOY_KEY
```

**Secret value:** (Copy this ENTIRE block - no brackets, no quotes)
```
-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQEAxgARLz1bUt6qmKOPDEYpEu4JVY7sxIL1Im9XeVkNIqXPS8Su
3/kniw3WVrYgQU5brUMI26k/vbj3ALy/UM2JMMwvz7GkpCmWlsNp2bt/uZ2A3Cdv
QJ5mhpauB184TaNCpfmGi5n7eu1KRKisxdi8mPSedrVsctSBCZoI5fna3SDaGVKv
joHcp3jPWKt2qoVhlCt+Uew1VnG1TEHXFHsEQTVOgerfpcetL8fg2tyKV1irIXiY
/UgUFjh8k9CfLolumoIDanh8HSVGJbH5en/cxZxuWGj5pOOGx22F+/v95k5CuL84
u4qb2TBgG2rlS/uxjsUThk6t/aBWbRwdCbcpBQIDAQABAoIBAEGvEgRW2W3jWjqq
v7C1sbiK6OPONzN1sjaLMzyZUyc0VFFxXQYGFJ0nqPw5DPg9M2KGA3FDc1bP/njr
JJh8ps9eXVoMN28SMNew2fOWJOgBnRbrqheItMBfSjo912LCD0EaRw0Wtvtvrpya
TD6SCPbA57S/uMtbPbdetyb7vSRvxSAMAf81fisQj46iIc8EH1IFWT2+dYfNistM
wWJMlx3QSJrfUwdCwHnnjh8hLk0IFBiAOEblHtUB4UZgiv+vyk+8/cz/HcZL+9dY
Q6oqgBvnGRMbwn4dP5yJfmHs2DqJf5Zo+HSdDXIMelq3l+okWNSuPp5NRv89LiVN
ij/gi90CgYEA5ll7NcnibJYd7EduVEV4PwSw6rgxnq0b81wCGxnIMKRtXtg6/jGH
PJ2qTzBQkJ0HKDIcmVdo9gYxyQPQFTu/yGHeYf84dPKlIx70qccQIfoVhObIwL1v
x6FeyghK/AscS6iPhKLDgtnn3h6DjLYjwN8knAS0rnrv9+kJG7JL/gsCgYEA3Axp
smo7c7AbzRHCtGEYgXQSDwZbTVXlhexYT/p8pR65nOUFo5rgUtfMrK6F7gtlgP9A
e6wqnzKHwIAMlIsNcx+UFMpYi9R2qwkL0KfQBbPnaH5YRSDGnEkTO7GeitGB8Hhm
cm69rU1OIaeJIH4OEfM24IJYODBwRf6kzvOOry8CgYAMMV5ZOYd3sfaBhEJtyYOU
6l2m/vr5aDZbilo+Lv4uvPVhGNb+j4aWCc5zBJ6vGPDBCu4Cm+LdavSFrGL+TLxZ
Ef0geM73OcTN+ByBRB0xfzhWYZTsxto82ejXjtrRPpFP2+tE3Qy2R2yDkF/sOdPo
qKcabxFVTwKWv8oQoj5tgwKBgAUd9MdFWSSTj9Hw+8oeB+favyDCURU3TiMTH+qc
NJHSaRaQ7NSlIVpL0mKhnFOwyCd7yBAYLNWO40FCuQgrQ6DNty/UlMKLqkbH6xJr
FJdNW7A+X+cboAK6YEwfEUTBInhpFFjM4nRJO+vkbXfn9oPMWBZYcZy84599EHAP
kd3ZAoGAWz3eJHoFOlDM7XLz/k5OGkzPnCrzPDFoA0XsEK/veIXOUiYaplyFIzk2
f0Eu0zmqNn+sLV7vmfAMTclM4uO8bLa3/Y+hWERrWO3UtJx1MPFfTSm1wJTm2ume
On+ShsijmIuSoalzuoJNSPMyS3blK7ypGPjxzuTcIOYKJqWy4Ps=
-----END RSA PRIVATE KEY-----
```

---

## ⚠️ **CRITICAL FORMATTING NOTES**

### ✅ **DO THIS:**
- Copy the text from inside each code block
- Paste directly into GitHub - **NO quotes, NO brackets, NO extra formatting**
- Include the complete SSH key with `-----BEGIN` and `-----END` lines

### ❌ **DON'T DO THIS:**
- Don't add quotes around the values
- Don't add brackets `[ ]` around anything
- Don't add extra spaces or formatting
- Don't forget the header/footer lines in the SSH key

---

## 📋 Quick Setup Steps

1. **Go to:** https://github.com/asi-alliance/asi-chain/settings/secrets/actions
2. **Click:** "New repository secret" (3 times)
3. **Copy/paste** the exact values from the boxes above
4. **Merge** your pull request
5. **Test** with a small edit to see auto-deployment!

## ✅ **After Setup**

You should see these 3 secrets listed:
- ✅ DEPLOY_HOST
- ✅ DEPLOY_USER  
- ✅ DEPLOY_KEY

## 🚀 **Ready to Use!**

Your technical writers can now edit documentation directly on GitHub and see changes auto-deploy to https://13.251.66.61 within minutes!