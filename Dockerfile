# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY . .
RUN dotnet restore PersonalAssistant.Api/PersonalAssistant.Api.csproj
RUN dotnet publish PersonalAssistant.Api/PersonalAssistant.Api.csproj -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Render PORT environment variable deta hai
ENV ASPNETCORE_URLS=http://0.0.0.0:$PORT
EXPOSE 8080

ENTRYPOINT ["dotnet", "PersonalAssistant.Api.dll"]
