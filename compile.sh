docker build -t wildapps/ios:0.0.1 . &&
kubectl scale --replicas=0 deployment deployment --namespace=ios &&
kubectl scale --replicas=2 deployment deployment --namespace=ios
