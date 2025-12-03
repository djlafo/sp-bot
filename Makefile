build:
	docker build --progress=plain -t djlafo/sp-bot -f Dockerfile .

push:
	aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 022498999375.dkr.ecr.us-east-2.amazonaws.com
	docker tag djlafo/sp-bot:latest 022498999375.dkr.ecr.us-east-2.amazonaws.com/djlafo/sp-bot:latest
	docker push 022498999375.dkr.ecr.us-east-2.amazonaws.com/djlafo/sp-bot:latest

pull:
	aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 022498999375.dkr.ecr.us-east-2.amazonaws.com
	docker pull 022498999375.dkr.ecr.us-east-2.amazonaws.com/djlafo/sp-bot:latest
	docker tag 022498999375.dkr.ecr.us-east-2.amazonaws.com/djlafo/sp-bot:latest djlafo/sp-bot

run: 
	docker rm sp-bot || true
	docker run -d --env-file ./.env -p 3000:3000 --name sp-bot djlafo/sp-bot