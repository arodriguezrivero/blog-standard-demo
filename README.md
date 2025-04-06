# Next JS & Open AI / GPT: Next-generation Next JS & AI apps
Proyecto basado en curso de Udemy

**Next JS + OpenAI GPT3.5: Build an SEO-friendly blog post gen app with auth0, GPT, stripe payments, tailwind, + MongoDB** de Tom Phillips ([curso en inglés](https://www.udemy.com/course/next-js-ai/)).

This is the starter repo for the [Next JS & Open AI / GPT: Next-generation Next JS & AI apps course](https://www.udemy.com/course/next-js-ai/?referralCode=CF9492ACD4991930F84E).

# Información Importante para tener en cuenta

# Login

- Utilizamos auth0
- Para crear el AUTH0_SECRET del .env.local utilizamos openssl. Para ello hay que descargar e instalar la aplicación de openssl de: https://wiki.openssl.org/index.php/Binaries --> https://slproweb.com/products/Win32OpenSSL.html 
- Luego ejecutamos desde la terminal ejecutamos: openssl rand -hex 32
- Esto lo que hace es crear un string largo como código (también se puede poner cualquiera pero este paso es mas recomendable)

