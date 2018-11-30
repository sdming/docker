## kubernetes 部署应用

# kubernetes 开发环境安装

省安装步骤，本次使用 docker-for-mac 测试

## build docker

创建 docker 镜像

```
docker build -t hzw/nodebook:v1 .

docker images | grep nodebook

```

## run docker

运行 docker, 测试是否可用

```

docker run --name nodebookv1 -p 3000:3000 hzw/nodebook:v1

```

## 项目部署到 kubernetes

使用 kubectl create 来部署项目

```
kubectl create -f  notebook-istio-deplyment.yaml
```

查看 service 和 development

```
kubectl get deployments
kubectl get service
kubectl describe service nodebook
kubectl get pod -l app=nodebook -o wide
```

请求服务，查看服务端响应

```
curl http://localhost:3000/version
```

使用 kubectl run 命令创建 Deployment 来管理 Pod。

```
kubectl run nodebook --image=hzw/nodebook:v1 --port=3000

kubectl get deployments
kubectl get pods

```

使用 kubectl expose 命令将 Pod 暴露到外部环境：

```
kubectl expose deployment nodebook --type=LoadBalancer --port=3000 --target-port=3000

kubectl get services
kubectl describe service nodebook
```

扩展实例

```
kubectl scale deployments/nodebook --replicas=4

kubectl get pods
```

更新 image

```
kubectl set image deployment/nodebook nodebook=hzw/nodebook:v2
```

删除 deployment

```
kubectl delete service nodebook
kubectl delete deployment notebook-deployment

kubectl get pods

```

## kubernetes deployment 管理

创建 deployment

```
kubectl create -f  nodebook-deployment.yaml

kubectl get deployments
```

升级

```
kubectl apply -f nodebook-deployment.yaml

kubectl rollout status deployment/nodebook-deployment
```

查看历史

```
kubectl rollout history deployment/nodebook-deployment
```

查看详情

```
kubectl describe deployment nodebook-deployment
```

回滚

```
kubectl rollout undo deployment nodebook-deployment
```
