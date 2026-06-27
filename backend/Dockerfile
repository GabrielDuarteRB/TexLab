FROM node:24

RUN apt-get update && apt-get install -y \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-bibtex-extra \
    latexmk \
    biber \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
