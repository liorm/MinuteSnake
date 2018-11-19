FROM node AS build

RUN npm install -g yarn typescript

COPY package* /app/
COPY yarn* /app/
WORKDIR /app/
RUN yarn

COPY tsconfig* /app/
COPY src /app/
WORKDIR /app/
RUN tsc --build


FROM nginx:stable AS final

RUN ln -sf /usr/share/nginx/html /var/www

COPY --from=build /app/scripts/ /var/www/scripts/
COPY index.html /var/www/
COPY style.css  /var/www/
